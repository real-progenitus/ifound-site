/**
 * Partner inquiries: the website's "become a partner" form.
 *
 * Many submissions come from people who only want to post a lost or found
 * item and never read who a partner is. So, once a reply domain is set up,
 * a submission does not reach the inbox straight away. The visitor gets an
 * automated reply restating that partners are venues and event organizers,
 * and pointing everyone else to the app. Replying to it confirms the request:
 * Resend receives the reply on PARTNER_REPLY_DOMAIN, the webhook in
 * app/api/partner-reply matches it back to the stored inquiry through the
 * token in the Reply-To address, and only then does the usual "New Partner
 * Inquiry" email go to the inbox, with their reply attached.
 *
 * With PARTNER_REPLY_DOMAIN unset, submissions go straight to the inbox as
 * they always did.
 */
import { randomBytes } from 'node:crypto';
import { routing } from '@/routing';
import { escapeHtml, sanitizeHeader } from '@/lib/email-utils';

export const PARTNER_INBOX = 'joaoalvaromota@gmail.com';
export const PARTNER_FROM = 'iFound <hello@ifound.tech>';
export const INQUIRIES_COLLECTION = 'PartnerInquiries';

const APP_DOWNLOAD_URL = 'https://ifound.tech/download';

/** Cap on the reply text we forward; the rest is still in Resend's Receiving log. */
const MAX_REPLY_CHARS = 10000;

export type Locale = (typeof routing.locales)[number];

export interface PartnerInquiry {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  locale: Locale;
}

export interface PartnerReply {
  /** Address the reply came from, as Resend reports it. */
  from: string;
  text: string;
  attachments: number;
}

export function toLocale(value: unknown): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : routing.defaultLocale;
}

/** The domain Resend receives replies on, or null while it isn't set up. */
export function partnerReplyDomain(): string | null {
  return process.env.PARTNER_REPLY_DOMAIN?.trim() || null;
}

/** Hex, so the token survives any case-folding a mail server applies. */
export function newInquiryToken(): string {
  return randomBytes(16).toString('hex');
}

export function replyAddress(token: string, domain: string): string {
  return `partners+${token}@${domain}`;
}

/**
 * The inquiry token in a received email's recipients, if any. Recipients can
 * arrive as a bare address or as `Name <address>`, so search inside each one.
 */
export function tokenFromRecipients(recipients: string[]): string | null {
  for (const recipient of recipients) {
    const match = /partners\+([0-9a-f]{32})@/i.exec(recipient);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/**
 * True for out-of-office replies and other machine-sent mail (RFC 3834 and
 * the common vendor headers), which must not count as a confirmation. Our
 * auto-reply carries Auto-Submitted itself, so compliant responders already
 * stay quiet; this catches the rest.
 */
export function isAutomatedEmail(headers: Record<string, string> | null): boolean {
  if (!headers) return false;
  const h: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) h[key.toLowerCase()] = String(value).toLowerCase();

  const autoSubmitted = h['auto-submitted'];
  if (autoSubmitted && autoSubmitted.trim() !== 'no') return true;
  if ('x-autoreply' in h || 'x-autorespond' in h || 'x-autoresponder' in h) return true;
  return ['bulk', 'junk', 'list', 'auto_reply'].includes(h['precedence']?.trim());
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * What the person actually wrote in their reply: the plain-text part (or the
 * HTML one flattened) without the `>`-quoted copy of our auto-reply. Falls
 * back to the whole body when everything was quoted.
 */
export function replyBody(email: { text: string | null; html: string | null }): string {
  const body = (email.text ?? (email.html ? htmlToText(email.html) : '')).replace(/\r\n/g, '\n');
  const unquoted = body
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return (unquoted || body.trim()).slice(0, MAX_REPLY_CHARS);
}

/**
 * The email the inbox gets for a partner inquiry. Reply-To is the person who
 * filled in the form, so answering it reaches them directly. Every field came
 * from an anonymous visitor: header-sanitised in the subject and plain text,
 * HTML-escaped in the HTML body.
 */
export function inboxEmail(inquiry: PartnerInquiry, reply?: PartnerReply) {
  const { company, firstName, lastName, email, message } = inquiry;
  const safeCompany = sanitizeHeader(company);
  const repliedFrom =
    reply && !reply.from.toLowerCase().includes(email.toLowerCase()) ? sanitizeHeader(reply.from) : null;
  const attachmentNote =
    reply && reply.attachments > 0
      ? `${reply.attachments} attachment(s) in the reply were not forwarded (see Resend → Receiving).`
      : null;

  const textLines = [
    'New Partner Inquiry',
    `Company: ${safeCompany}`,
    `Contact Name: ${sanitizeHeader(firstName)} ${sanitizeHeader(lastName)}`,
    `Email: ${sanitizeHeader(email)}`,
    '',
    'Message:',
    message,
  ];
  if (reply) {
    textLines.push('', '---', 'They replied to our partners-only auto-reply:');
    if (repliedFrom) textLines.push(`(from ${repliedFrom})`);
    textLines.push('', reply.text);
    if (attachmentNote) textLines.push('', attachmentNote);
  }

  const toHtml = (value: string) => escapeHtml(value).replace(/\n/g, '<br>');
  let html = `
    <h2>New Partner Inquiry</h2>
    <p><strong>Company:</strong> ${escapeHtml(safeCompany)}</p>
    <p><strong>Contact Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${toHtml(message)}</p>
  `;
  if (reply) {
    html += `
    <hr>
    <p><strong>They replied to our partners-only auto-reply${repliedFrom ? ` (from ${escapeHtml(repliedFrom)})` : ''}:</strong></p>
    <p>${toHtml(reply.text)}</p>
    ${attachmentNote ? `<p><em>${escapeHtml(attachmentNote)}</em></p>` : ''}
  `;
  }

  return {
    from: PARTNER_FROM,
    to: PARTNER_INBOX,
    replyTo: email,
    subject: `New Partner Inquiry from ${safeCompany}`,
    text: textLines.join('\n'),
    html,
  };
}

interface AutoReplyCopy {
  subject: string;
  greeting: string;
  thanks: string;
  partnersOnly: string;
  justPosting: string;
  getApp: string;
  replyToConfirm: string;
  signoff: string;
}

/**
 * The automated reply sent to whoever filled in the form, in the language of
 * the page they used. It deliberately repeats nothing they typed: the address
 * is unverified, so echoing a name or message would let anyone use the form
 * to send their own text to a stranger from our domain.
 */
export async function autoReplyEmail(to: string, locale: Locale, token: string, domain: string) {
  const messages = (await import(`../messages/${locale}.json`)).default;
  const copy = messages.partner.autoReply as AutoReplyCopy;

  const text = [
    copy.greeting,
    '',
    copy.thanks,
    '',
    copy.partnersOnly,
    '',
    copy.justPosting,
    `${copy.getApp}: ${APP_DOWNLOAD_URL}`,
    '',
    copy.replyToConfirm,
    '',
    copy.signoff,
  ].join('\n');

  const html = `
    <p>${escapeHtml(copy.greeting)}</p>
    <p>${escapeHtml(copy.thanks)}</p>
    <p>${escapeHtml(copy.partnersOnly)}</p>
    <p>${escapeHtml(copy.justPosting)}<br><a href="${APP_DOWNLOAD_URL}">${escapeHtml(copy.getApp)}</a></p>
    <p>${escapeHtml(copy.replyToConfirm)}</p>
    <p>${escapeHtml(copy.signoff)}</p>
  `;

  return {
    from: PARTNER_FROM,
    to,
    replyTo: replyAddress(token, domain),
    subject: copy.subject,
    text,
    html,
    headers: {
      // RFC 3834: tells out-of-office responders not to answer this email.
      'Auto-Submitted': 'auto-replied',
      // Same request for Exchange / Outlook.
      'X-Auto-Response-Suppress': 'All',
    },
  };
}
