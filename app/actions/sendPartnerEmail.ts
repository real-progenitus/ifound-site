'use server';

import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { createLogger } from '@/lib/logger';
import { checkServerActionGuard } from '@/lib/api-guard';
import { EMAIL_PATTERN } from '@/lib/email-utils';
import { db } from '@/lib/firebase-admin';
import {
  INQUIRIES_COLLECTION,
  autoReplyEmail,
  inboxEmail,
  newInquiryToken,
  partnerReplyDomain,
  toLocale,
  type PartnerInquiry,
} from '@/lib/partner-inquiry';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('partner-email');

/**
 * Input contract enforced on the server.
 *
 * All five fields are required non-empty strings. Each has an explicit upper
 * bound so a hostile client can't (a) blow up our memory with a gigantic
 * `message`, (b) drag us past Resend's own payload limits, or (c) DoS the
 * validator with a pathological string.
 *
 * `email` is validated against a single HTML5-style pattern — we don't try
 * to beat RFC 5322; the real delivery check happens at Resend.
 */
const LIMITS = {
  company: 200,
  firstName: 100,
  lastName: 100,
  email: 320, // RFC 5321 mailbox max
  message: 5000,
} as const;

export interface PartnerFormData {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  /** Page locale, for the auto-reply's language. Unknown values fall back to English. */
  locale?: string;
}

type ErrorCode =
  | 'invalid_input'
  | 'rate_limited'
  | 'forbidden'
  | 'unavailable'
  | 'send_failed';

export interface PartnerEmailResult {
  success: boolean;
  error?: string;
  code?: ErrorCode;
  /** Seconds the client should wait before retrying (for rate-limit / 503). */
  retryAfter?: number;
  /** True when the visitor was sent the auto-reply and must answer it to confirm. */
  awaitingReply?: boolean;
}

/**
 * Parse + validate untrusted input. Returns either a fully-typed, trimmed
 * payload or a structured error. No exceptions — we want the caller to stay
 * on the happy path for rendering form errors.
 */
function validate(
  raw: unknown
): { ok: true; value: PartnerFormData } | { ok: false; field: keyof PartnerFormData | 'body'; reason: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, field: 'body', reason: 'Invalid request body.' };
  }
  const obj = raw as Record<string, unknown>;

  const required: (keyof typeof LIMITS)[] = [
    'company',
    'firstName',
    'lastName',
    'email',
    'message',
  ];
  const out: Partial<PartnerFormData> = {};

  for (const key of required) {
    const v = obj[key];
    if (typeof v !== 'string') {
      return { ok: false, field: key, reason: `${key} must be a string.` };
    }
    const trimmed = v.trim();
    if (trimmed.length === 0) {
      return { ok: false, field: key, reason: `${key} is required.` };
    }
    if (trimmed.length > LIMITS[key]) {
      return {
        ok: false,
        field: key,
        reason: `${key} exceeds the ${LIMITS[key]}-character limit.`,
      };
    }
    out[key] = trimmed;
  }

  if (!EMAIL_PATTERN.test(out.email!)) {
    return { ok: false, field: 'email', reason: 'Invalid email address.' };
  }

  return { ok: true, value: out as PartnerFormData };
}

/**
 * Keep the inquiry until the visitor replies, under the token their reply
 * address carries, and return the auto-reply that asks them to.
 */
async function storeForReply(inquiry: PartnerInquiry, replyDomain: string) {
  const token = newInquiryToken();
  await db()
    .collection(INQUIRIES_COLLECTION)
    .doc(token)
    .set({ ...inquiry, status: 'awaiting_reply', createdAt: FieldValue.serverTimestamp() });
  return autoReplyEmail(inquiry.email, inquiry.locale, token, replyDomain);
}

export async function sendPartnerEmail(data: PartnerFormData): Promise<PartnerEmailResult> {
  // 1. Rate limit BEFORE doing any work. An attacker hitting this endpoint in
  //    a loop should not be able to burn Resend quota or fill our logs with
  //    validation errors — cap requests at the edge of the action.
  //
  //    Budget is deliberately tight (mutating endpoint, human-driven form):
  //    3 submissions / IP / minute + 30 / UA / minute. A real partner filling
  //    out the form never hits this; a scripted attacker does immediately.
  const guard = await checkServerActionGuard({
    name: 'partner-email',
    requestsPerMinute: 3,
  });
  if (!guard.ok) {
    if (guard.status === 403) {
      log.warn('partner email rejected by origin allowlist');
      return { success: false, error: 'Forbidden.', code: 'forbidden' };
    }
    if (guard.status === 503) {
      log.warn('partner email rejected — rate limiter unavailable');
      return {
        success: false,
        error: 'Service temporarily unavailable. Please try again shortly.',
        code: 'unavailable',
        retryAfter: guard.retryAfter,
      };
    }
    log.warn('partner email rate limited', { retryAfter: guard.retryAfter });
    return {
      success: false,
      error: 'Too many submissions. Please try again in a moment.',
      code: 'rate_limited',
      retryAfter: guard.retryAfter,
    };
  }

  // 2. Validate + normalise. We only continue with the trimmed, bounded
  //    version from here on.
  const parsed = validate(data);
  if (!parsed.ok) {
    return { success: false, error: parsed.reason, code: 'invalid_input' };
  }
  const inquiry: PartnerInquiry = { ...parsed.value, locale: toLocale(data.locale) };

  // 3. With a reply domain set up, the inbox only hears about the inquiry once
  //    the visitor answers the partners-only auto-reply (see
  //    lib/partner-inquiry.ts). Without one, it goes straight to the inbox.
  const replyDomain = partnerReplyDomain();

  try {
    const email = replyDomain ? await storeForReply(inquiry, replyDomain) : inboxEmail(inquiry);
    const result = await resend.emails.send(email);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, awaitingReply: replyDomain !== null };
  } catch (error) {
    log.error('failed to send partner email', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again later.',
      code: 'send_failed',
    };
  }
}
