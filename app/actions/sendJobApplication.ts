'use server';

import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';
import { checkServerActionGuard } from '@/lib/api-guard';
import { EMAIL_PATTERN, escapeHtml, sanitizeHeader } from '@/lib/email-utils';
import { getJob, MAX_CV_BYTES } from '@/lib/jobs';
import { DIAL_CODES, parsePhone, type Phone } from '@/lib/phone';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('job-application');

/** Where applications land. Reply-To is the applicant, so replying reaches them. */
const JOBS_INBOX = 'franciscoocostaa11@gmail.com';

const LIMITS = {
  slug: 100,
  firstName: 100,
  lastName: 100,
  email: 320, // RFC 5321 mailbox max
  message: 5000,
  phone: 40,
  phoneCountry: 2,
  country: 2,
  linkedin: 500,
} as const;

const REQUIRED = ['slug', 'firstName', 'lastName', 'email', 'phone', 'country', 'message'] as const;
// phoneCountry is only optional because a number typed with "+" carries its own.
const OPTIONAL = ['phoneCountry', 'linkedin'] as const;

/**
 * Accepted CV formats, keyed by extension, with the leading bytes a real file
 * of that type starts with. The extension alone is the client's claim; the
 * magic bytes are what stop an executable renamed to cv.pdf from being
 * forwarded to the inbox as an attachment.
 */
const CV_TYPES: Record<string, { magic: number[]; contentType: string }> = {
  pdf: { magic: [0x25, 0x50, 0x44, 0x46], contentType: 'application/pdf' }, // %PDF
  docx: {
    magic: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 (zip)
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  doc: { magic: [0xd0, 0xcf, 0x11, 0xe0], contentType: 'application/msword' }, // OLE2
};

type ErrorCode =
  | 'invalid_input'
  | 'invalid_email'
  | 'invalid_phone'
  | 'invalid_link'
  | 'file_too_large'
  | 'file_invalid'
  | 'rate_limited'
  | 'forbidden'
  | 'unavailable'
  | 'send_failed';

export interface JobApplicationResult {
  success: boolean;
  error?: string;
  code?: ErrorCode;
  /** Seconds the client should wait before retrying (for rate-limit / 503). */
  retryAfter?: number;
}

interface Application {
  slug: string;
  jobTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  phone: Phone;
  /** Where the applicant lives, named in English: "Turkey". */
  country: string;
  linkedin?: string;
  cv?: { filename: string; content: Buffer; contentType: string };
}

type Invalid = { ok: false; code: ErrorCode; reason: string };

/** "Turkey" from "TR", in English for the inbox whatever language the page was in. */
function countryName(cc: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

function invalid(reason: string, code: ErrorCode = 'invalid_input'): Invalid {
  return { ok: false, code, reason };
}

/**
 * Keep a filename safe to show and to put in an attachment header: no path,
 * no control characters, bounded length, and the extension we validated.
 */
function sanitizeFilename(name: string, ext: string): string {
  const base = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\x00-\x1F\x7F"]/g, '')
    .replace(/\.[^.]*$/, '')
    .trim()
    .slice(0, 100);
  return `${base || 'cv'}.${ext}`;
}

async function validateCv(value: FormDataEntryValue | null): Promise<
  { ok: true; cv?: Application['cv'] } | Invalid
> {
  // An empty file input still submits a File with no name and size 0.
  if (value == null || (typeof value !== 'string' && value.size === 0)) {
    return { ok: true };
  }
  if (typeof value === 'string') return invalid('cv must be a file.', 'file_invalid');
  if (value.size > MAX_CV_BYTES) return invalid('CV is too large.', 'file_too_large');

  const ext = value.name.split('.').pop()?.toLowerCase() ?? '';
  const type = CV_TYPES[ext];
  if (!type) return invalid('CV must be a PDF or Word document.', 'file_invalid');

  const content = Buffer.from(await value.arrayBuffer());
  if (!type.magic.every((byte, i) => content[i] === byte)) {
    return invalid('CV content does not match its file type.', 'file_invalid');
  }

  return {
    ok: true,
    cv: { filename: sanitizeFilename(value.name, ext), content, contentType: type.contentType },
  };
}

/**
 * Turn what someone typed in the profile-link field into an absolute http(s)
 * URL, or null if it isn't one. People mostly type `linkedin.com/in/name`
 * without a scheme, so a missing one is filled in rather than rejected;
 * any other scheme (`javascript:` and friends) is refused.
 */
function normalizeLink(input: string): string | null {
  // A run of letters then ":" is a scheme (https:, javascript:); a bare host
  // like `www.linkedin.com/in/x` never matches because of its dots.
  const withScheme = /^[a-z]+:/i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.')) return null;
  return url.href;
}

/**
 * Parse + validate untrusted form data. Returns either a trimmed, bounded
 * application or a structured error — never throws.
 */
async function validate(raw: unknown): Promise<{ ok: true; value: Application } | Invalid> {
  if (!(raw instanceof FormData)) return invalid('Invalid request body.');

  const out: Record<string, string> = {};
  for (const key of [...REQUIRED, ...OPTIONAL]) {
    const v = raw.get(key);
    if (v != null && typeof v !== 'string') return invalid(`${key} must be a string.`);
    const trimmed = (v ?? '').trim();
    if (trimmed.length === 0) {
      if ((REQUIRED as readonly string[]).includes(key)) return invalid(`${key} is required.`);
      continue;
    }
    if (trimmed.length > LIMITS[key]) {
      return invalid(`${key} exceeds the ${LIMITS[key]}-character limit.`);
    }
    out[key] = trimmed;
  }

  if (raw.get('consent') !== 'on') return invalid('Consent is required.');
  if (!EMAIL_PATTERN.test(out.email)) return invalid('Invalid email address.', 'invalid_email');

  const phone = parsePhone(out.phoneCountry ?? '', out.phone);
  if (!phone) return invalid('Invalid phone number.', 'invalid_phone');

  // The form only offers the picker's countries; anything else was hand-made.
  if (!Object.hasOwn(DIAL_CODES, out.country)) return invalid('Unknown country.');

  if (out.linkedin) {
    const link = normalizeLink(out.linkedin);
    if (!link) return invalid('Invalid profile link.', 'invalid_link');
    out.linkedin = link;
  }

  const job = getJob(out.slug);
  if (!job || !job.open) return invalid('This position is not open.');

  const cv = await validateCv(raw.get('cv'));
  if (!cv.ok) return cv;

  return {
    ok: true,
    value: {
      slug: job.slug,
      jobTitle: job.title.en,
      firstName: out.firstName,
      lastName: out.lastName,
      email: out.email,
      message: out.message,
      phone,
      country: countryName(out.country),
      linkedin: out.linkedin,
      cv: cv.cv,
    },
  };
}

export async function sendJobApplication(formData: FormData): Promise<JobApplicationResult> {
  // 1. Rate limit before doing any work — same budget as the partner form:
  //    a candidate submits once, a script hammering the endpoint does not
  //    get to burn Resend quota or flood the inbox.
  const guard = await checkServerActionGuard({
    name: 'job-application',
    requestsPerMinute: 3,
  });
  if (!guard.ok) {
    if (guard.status === 403) {
      log.warn('job application rejected by origin allowlist');
      return { success: false, error: 'Forbidden.', code: 'forbidden' };
    }
    if (guard.status === 503) {
      log.warn('job application rejected — rate limiter unavailable');
      return {
        success: false,
        error: 'Service temporarily unavailable. Please try again shortly.',
        code: 'unavailable',
        retryAfter: guard.retryAfter,
      };
    }
    log.warn('job application rate limited', { retryAfter: guard.retryAfter });
    return {
      success: false,
      error: 'Too many submissions. Please try again in a moment.',
      code: 'rate_limited',
      retryAfter: guard.retryAfter,
    };
  }

  // 2. Validate + normalise.
  const parsed = await validate(formData);
  if (!parsed.ok) {
    return { success: false, error: parsed.reason, code: parsed.code };
  }
  const app = parsed.value;

  // 3. Build the email. Header-bound values are control-character stripped;
  //    every value in the HTML body is escaped.
  const name = `${sanitizeHeader(app.firstName)} ${sanitizeHeader(app.lastName)}`;
  const subject = `Job application: ${app.jobTitle} — ${name} (${app.country})`;

  const textBody = [
    `New application for ${app.jobTitle} (${app.slug})`,
    `Name: ${name}`,
    `Email: ${sanitizeHeader(app.email)}`,
    `Phone: ${app.phone.display}`,
    `Country: ${app.country}`,
    `LinkedIn / portfolio: ${app.linkedin ? sanitizeHeader(app.linkedin) : '—'}`,
    `CV: ${app.cv ? app.cv.filename : 'not attached'}`,
    '',
    'Message:',
    app.message,
  ].join('\n');

  // parsePhone only ever returns "+" and digits, so these need no escaping.
  const phoneHtml =
    `<a href="tel:${app.phone.e164}">${app.phone.display}</a>` +
    ` · <a href="https://wa.me/${app.phone.e164.slice(1)}">WhatsApp</a>`;
  const linkedinHtml = app.linkedin
    ? `<a href="${escapeHtml(app.linkedin)}">${escapeHtml(app.linkedin)}</a>`
    : '—';
  const htmlBody = `
    <h2>New application for ${escapeHtml(app.jobTitle)}</h2>
    <p><strong>Name:</strong> ${escapeHtml(app.firstName)} ${escapeHtml(app.lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(app.email)}</p>
    <p><strong>Phone:</strong> ${phoneHtml}</p>
    <p><strong>Country:</strong> ${escapeHtml(app.country)}</p>
    <p><strong>LinkedIn / portfolio:</strong> ${linkedinHtml}</p>
    <p><strong>CV:</strong> ${app.cv ? escapeHtml(app.cv.filename) : 'not attached'}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(app.message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const result = await resend.emails.send({
      from: 'iFound <hello@ifound.tech>',
      to: JOBS_INBOX,
      replyTo: app.email,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: app.cv
        ? [{ filename: app.cv.filename, content: app.cv.content, contentType: app.cv.contentType }]
        : undefined,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true };
  } catch (error) {
    log.error('failed to send job application', error);
    return {
      success: false,
      error: 'Failed to send application. Please try again later.',
      code: 'send_failed',
    };
  }
}
