import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { createLogger } from '@/lib/logger';
import { db } from '@/lib/firebase-admin';
import {
  INQUIRIES_COLLECTION,
  inboxEmail,
  isAutomatedEmail,
  replyBody,
  tokenFromRecipients,
  type PartnerInquiry,
} from '@/lib/partner-inquiry';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('partner-reply');

/**
 * Resend webhook (`email.received`) for replies to the partners-only
 * auto-reply. A reply confirms the inquiry, so it is passed to the inbox as
 * the usual "New Partner Inquiry" email with the reply appended. See
 * lib/partner-inquiry.ts for the whole flow.
 *
 * The Svix signature is the only authentication: everything else in the
 * request, and in the received email, is attacker-controlled.
 *
 * Status codes matter here: Resend retries anything but a 2xx. So mail we
 * choose to ignore (no token, unknown token, out-of-office) gets a 200, and
 * only failures worth retrying get a 500. A retry can't double-forward: the
 * inbox send is keyed on the received email's id.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    log.error('RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const payload = await request.text();
  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret: secret,
    });
  } catch {
    log.warn('rejected webhook with a bad signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ignored: event.type });
  }

  const { email_id: emailId, to, cc } = event.data;
  const token = tokenFromRecipients([...to, ...(cc ?? [])]);
  if (!token) {
    log.info('received email is not a partner reply', { emailId });
    return NextResponse.json({ ignored: 'no_token' });
  }

  try {
    const ref = db().collection(INQUIRIES_COLLECTION).doc(token);
    const snap = await ref.get();
    if (!snap.exists) {
      log.warn('partner reply for an unknown inquiry', { emailId });
      return NextResponse.json({ ignored: 'unknown_token' });
    }

    const { data: received, error } = await resend.emails.receiving.get(emailId);
    if (error || !received) throw new Error(error?.message ?? 'received email not found');

    if (isAutomatedEmail(received.headers)) {
      log.info('ignored automated reply to the partner auto-reply', { emailId });
      return NextResponse.json({ ignored: 'automated' });
    }

    const inquiry = snap.data() as PartnerInquiry;
    const sent = await resend.emails.send(
      inboxEmail(inquiry, {
        from: received.from,
        text: replyBody(received),
        attachments: received.attachments?.length ?? 0,
      }),
      { idempotencyKey: `partner-reply/${emailId}` }
    );
    if (sent.error) throw new Error(sent.error.message);

    await ref.update({
      status: 'forwarded',
      forwardedAt: FieldValue.serverTimestamp(),
      replyEmailIds: FieldValue.arrayUnion(emailId),
    });

    return NextResponse.json({ forwarded: true });
  } catch (err) {
    log.error('failed to forward partner reply', err);
    return NextResponse.json({ error: 'Forward failed' }, { status: 500 });
  }
}
