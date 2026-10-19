/**
 * Helpers shared by the server actions that turn a public form into an email
 * (partner inquiries, job applications). Every value they handle came from an
 * anonymous visitor, so all of it is treated as hostile.
 */

// Conservative email pattern (same shape as HTML5's default input[type=email]).
// Deliberately cheap to evaluate — no catastrophic-backtracking alternation.
// We don't try to beat RFC 5322; the real delivery check happens at Resend.
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * HTML-entity escape for user content spliced into an email body.
 *
 * Order matters: `&` first so we don't double-escape the entities we
 * introduce for the other characters.
 */
export function escapeHtml(input: string): string {
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
export function sanitizeHeader(input: string): string {
  return input.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
}
