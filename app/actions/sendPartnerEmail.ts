'use server';

import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';
import { checkServerActionGuard } from '@/lib/api-guard';

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

// Conservative email pattern (same shape as HTML5's default input[type=email]).
// Deliberately cheap to evaluate — no catastrophic-backtracking alternation.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface PartnerFormData {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
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

  const required: (keyof PartnerFormData)[] = [
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
 * HTML-entity escape for user content spliced into an email body.
 *
 * Order matters: `&` first so we don't double-escape the entities we
 * introduce for the other characters.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitise a string that will be interpolated into an email header (Subject).
 *
 * Drops CR/LF and other C0 control characters — those are the classic
 * header-injection vector (`\r\nBcc: attacker@example.com`). Resend's client
 * likely handles this too, but we defend in depth: we never hand a
 * header-building library a string it can mis-frame.
 */
function sanitizeHeader(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
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
  const { company, firstName, lastName, email, message } = parsed.value;

  // 3. Build the email. Plain-text body gets header-sanitised interpolations;
  //    HTML body gets per-field HTML escaping so nothing in a user field can
  //    render as markup or break out of the template.
  const safeCompany = sanitizeHeader(company);
  const subject = `New Partner Inquiry from ${safeCompany}`;

  const textBody = [
    'New Partner Inquiry',
    `Company: ${safeCompany}`,
    `Contact Name: ${sanitizeHeader(firstName)} ${sanitizeHeader(lastName)}`,
    `Email: ${sanitizeHeader(email)}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const htmlMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const htmlBody = `
    <h2>New Partner Inquiry</h2>
    <p><strong>Company:</strong> ${escapeHtml(safeCompany)}</p>
    <p><strong>Contact Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${htmlMessage}</p>
  `;

  try {
    const result = await resend.emails.send({
      from: 'hello@gadgetconsulting.pt',
      to: 'joaoalvaromota@gmail.com',
      subject,
      text: textBody,
      html: htmlBody,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true };
  } catch (error) {
    log.error('failed to send partner email', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again later.',
      code: 'send_failed',
    };
  }
}
