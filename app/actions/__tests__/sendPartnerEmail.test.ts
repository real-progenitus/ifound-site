/**
 * Tests for the `sendPartnerEmail` server action, pinning the three
 * protections added for M-new-4:
 *
 *   1. Rate limiting (403 / 429 / 503 from the shared guard are translated
 *      into structured results without ever calling Resend).
 *   2. Schema validation (missing / wrong-type / over-length / bad-email
 *      payloads are rejected before we call Resend).
 *   3. HTML escaping + subject header sanitisation (no user input can break
 *      out of the template or inject headers, even if it contains angle
 *      brackets, quotes, or CR/LF).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// ---- Shared mocks ----

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const guardMock = vi.fn();
vi.mock('@/lib/api-guard', () => ({
  checkServerActionGuard: guardMock,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Helper: lazy-import so each test can reset mocks before the module loads.
async function loadAction() {
  const mod = await import('../sendPartnerEmail');
  return mod.sendPartnerEmail;
}

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    company: 'Acme Co',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    message: 'Hello there',
    ...overrides,
  };
}

function getSendArgs() {
  return (sendMock as Mock).mock.calls[0][0] as {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  };
}

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  guardMock.mockReset();
  // Default: guard allows the request.
  guardMock.mockResolvedValue({ ok: true });
  // Default: Resend succeeds.
  sendMock.mockResolvedValue({ error: null, data: { id: 'test_id' } });
});

describe('sendPartnerEmail — rate limit + origin guard', () => {
  it('returns rate_limited without calling Resend on 429', async () => {
    guardMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      retryAfter: 17,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 17000,
    });
    const send = await loadAction();

    const result = await send(validInput() as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('rate_limited');
    expect(result.retryAfter).toBe(17);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns forbidden on 403 without calling Resend', async () => {
    guardMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const send = await loadAction();

    const result = await send(validInput() as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('forbidden');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns unavailable on 503 and surfaces retryAfter', async () => {
    guardMock.mockResolvedValueOnce({ ok: false, status: 503, retryAfter: 60 });
    const send = await loadAction();

    const result = await send(validInput() as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('unavailable');
    expect(result.retryAfter).toBe(60);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('calls the guard with the expected budget + name', async () => {
    const send = await loadAction();
    await send(validInput() as never);
    expect(guardMock).toHaveBeenCalledWith({
      name: 'partner-email',
      requestsPerMinute: 3,
    });
  });
});

describe('sendPartnerEmail — schema validation', () => {
  it('rejects a non-object payload without calling Resend', async () => {
    const send = await loadAction();
    const result = await send(null as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects missing required fields', async () => {
    const send = await loadAction();
    const result = await send(validInput({ company: '' }) as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only fields as empty', async () => {
    const send = await loadAction();
    const result = await send(validInput({ firstName: '   ' }) as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
  });

  it('rejects non-string fields', async () => {
    const send = await loadAction();
    const result = await send(validInput({ email: 42 }) as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
  });

  it('rejects over-length fields', async () => {
    const send = await loadAction();
    const result = await send(
      validInput({ message: 'x'.repeat(5001) }) as never
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
  });

  it('rejects malformed email addresses', async () => {
    const send = await loadAction();
    const result = await send(
      validInput({ email: 'not-an-email' }) as never
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid_input');
  });

  it('accepts a well-formed payload', async () => {
    const send = await loadAction();
    const result = await send(validInput() as never);
    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe('sendPartnerEmail — HTML escaping + header sanitisation', () => {
  it('escapes angle brackets so a user cannot inject markup into the HTML body', async () => {
    const send = await loadAction();
    await send(
      validInput({
        company: '<script>alert(1)</script>',
        message: '<img src=x onerror=alert(1)>',
      }) as never
    );

    const args = getSendArgs();
    // Raw markup must not appear anywhere in the HTML body.
    expect(args.html).not.toContain('<script>');
    expect(args.html).not.toContain('<img src=x');
    // Escaped form should be present instead.
    expect(args.html).toContain('&lt;script&gt;');
    expect(args.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes quotes and ampersands', async () => {
    const send = await loadAction();
    await send(
      validInput({
        firstName: 'A"ngle',
        lastName: "O'Neil",
        message: 'Tom & Jerry',
      }) as never
    );

    const args = getSendArgs();
    expect(args.html).toContain('A&quot;ngle');
    expect(args.html).toContain('O&#39;Neil');
    expect(args.html).toContain('Tom &amp; Jerry');
  });

  it('strips CR/LF from fields that flow into the Subject header', async () => {
    const send = await loadAction();
    await send(
      validInput({
        company: 'Evil Co\r\nBcc: attacker@example.com',
      }) as never
    );

    const args = getSendArgs();
    // The real protection is that CR/LF are gone — that's what would have
    // let an attacker inject a new header line. The literal substring
    // "Bcc:" remaining inside the subject is harmless (it's one line of text
    // to whoever reads the email), and obfuscating it would be security
    // theatre.
    expect(args.subject).not.toMatch(/[\r\n]/);
    // Also double-check control characters more broadly.
    // eslint-disable-next-line no-control-regex
    expect(args.subject).not.toMatch(/[\x00-\x1F\x7F]/);
  });

  it('preserves newlines in the plain-text message body', async () => {
    const send = await loadAction();
    await send(
      validInput({ message: 'line one\nline two' }) as never
    );

    const args = getSendArgs();
    expect(args.text).toContain('line one\nline two');
  });

  it('converts message newlines to <br> in the HTML body after escaping', async () => {
    const send = await loadAction();
    await send(
      validInput({ message: 'a & b\n<c>' }) as never
    );

    const args = getSendArgs();
    expect(args.html).toContain('a &amp; b<br>&lt;c&gt;');
  });
});

describe('sendPartnerEmail — Resend failures', () => {
  it('returns a generic send_failed error without leaking the underlying message', async () => {
    sendMock.mockResolvedValueOnce({
      error: { message: 'internal upstream detail' },
      data: null,
    });
    const send = await loadAction();

    const result = await send(validInput() as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('send_failed');
    // The raw Resend error message must not be surfaced to the client.
    expect(result.error).not.toContain('internal upstream detail');
  });

  it('handles thrown errors from the Resend client', async () => {
    sendMock.mockRejectedValueOnce(new Error('network down'));
    const send = await loadAction();

    const result = await send(validInput() as never);
    expect(result.success).toBe(false);
    expect(result.code).toBe('send_failed');
    expect(result.error).not.toContain('network down');
  });
});
