/**
 * Tests for the `sendJobApplication` server action: rate limiting, input
 * validation (including the optional CV upload), HTML escaping / header
 * sanitisation, and where the email goes.
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

// A fixed catalogue so the tests don't depend on whatever jobs are live.
vi.mock('@/lib/jobs', () => {
  const jobs = [
    { slug: 'open-role', open: true, title: { en: 'Open Role', pt: 'Vaga Aberta' } },
    { slug: 'closed-role', open: false, title: { en: 'Closed Role', pt: 'Vaga Fechada' } },
  ];
  return {
    MAX_CV_BYTES: 4 * 1024 * 1024,
    getJob: (slug: string) => jobs.find((j) => j.slug === slug),
  };
});

async function loadAction() {
  const mod = await import('../sendJobApplication');
  return mod.sendJobApplication;
}

const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]; // %PDF-1.4

function validForm(overrides: Record<string, string | File | null> = {}): FormData {
  const fields: Record<string, string | File | null> = {
    slug: 'open-role',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phoneCountry: 'PT',
    phone: '912 345 678',
    message: 'I would love to join.',
    consent: 'on',
    ...overrides,
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) fd.append(key, value);
  }
  return fd;
}

function getSendArgs() {
  return (sendMock as Mock).mock.calls[0][0] as {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    text: string;
    html: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  };
}

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  guardMock.mockReset();
  guardMock.mockResolvedValue({ ok: true });
  sendMock.mockResolvedValue({ error: null, data: { id: 'test_id' } });
});

describe('sendJobApplication — rate limit + origin guard', () => {
  it('returns rate_limited without calling Resend on 429', async () => {
    guardMock.mockResolvedValueOnce({ ok: false, status: 429, retryAfter: 17 });
    const send = await loadAction();
    const result = await send(validForm());
    expect(result).toMatchObject({ success: false, code: 'rate_limited', retryAfter: 17 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns forbidden on 403 without calling Resend', async () => {
    guardMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const send = await loadAction();
    const result = await send(validForm());
    expect(result).toMatchObject({ success: false, code: 'forbidden' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns unavailable on 503 and surfaces retryAfter', async () => {
    guardMock.mockResolvedValueOnce({ ok: false, status: 503, retryAfter: 60 });
    const send = await loadAction();
    const result = await send(validForm());
    expect(result).toMatchObject({ success: false, code: 'unavailable', retryAfter: 60 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('calls the guard with the expected budget + name', async () => {
    const send = await loadAction();
    await send(validForm());
    expect(guardMock).toHaveBeenCalledWith({ name: 'job-application', requestsPerMinute: 3 });
  });
});

describe('sendJobApplication — validation', () => {
  it.each([
    ['a non-FormData payload', null],
    ['a missing first name', validForm({ firstName: null })],
    ['a missing phone', validForm({ phone: null })],
    ['a whitespace-only message', validForm({ message: '   ' })],
    ['an over-length message', validForm({ message: 'x'.repeat(5001) })],
    ['missing consent', validForm({ consent: null })],
    ['an unknown job', validForm({ slug: 'nope' })],
    ['a closed job', validForm({ slug: 'closed-role' })],
  ])('rejects %s without calling Resend', async (_label, input) => {
    const send = await loadAction();
    const result = await send(input as FormData);
    expect(result).toMatchObject({ success: false, code: 'invalid_input' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with invalid_email', async () => {
    const send = await loadAction();
    const result = await send(validForm({ email: 'not-an-email' }));
    expect(result).toMatchObject({ success: false, code: 'invalid_email' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([
    ['letters', { phone: 'call me' }],
    ['too few digits', { phone: '123' }],
    ['an unknown country', { phoneCountry: 'ZZ' }],
    ['no country for a national number', { phoneCountry: null }],
  ])('rejects a phone with %s as invalid_phone', async (_label, overrides) => {
    const send = await loadAction();
    const result = await send(validForm(overrides));
    expect(result).toMatchObject({ success: false, code: 'invalid_phone' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('puts the international number, a call link and a WhatsApp link in the email', async () => {
    const send = await loadAction();
    await send(validForm());
    const args = getSendArgs();
    expect(args.text).toContain('Phone: +351 912345678');
    expect(args.html).toContain('href="tel:+351912345678"');
    expect(args.html).toContain('href="https://wa.me/351912345678"');
  });

  it('takes a number typed with + as international whatever country is picked', async () => {
    const send = await loadAction();
    const result = await send(validForm({ phoneCountry: 'ES', phone: '+44 7700 900123' }));
    expect(result.success).toBe(true);
    expect(getSendArgs().html).toContain('href="tel:+447700900123"');
  });

  it.each([
    ['a javascript: link', 'javascript:alert(1)'],
    ['a mailto: link', 'mailto:ada@example.com'],
    ['text that is not a link', 'not a url'],
    ['a host without a dot', 'linkedin'],
  ])('rejects %s with invalid_link', async (_label, linkedin) => {
    const send = await loadAction();
    const result = await send(validForm({ linkedin }));
    expect(result).toMatchObject({ success: false, code: 'invalid_link' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([
    ['linkedin.com/in/ada', 'https://linkedin.com/in/ada'],
    ['www.linkedin.com/in/ada', 'https://www.linkedin.com/in/ada'],
    ['http://ada.dev', 'http://ada.dev/'],
    ['https://linkedin.com/in/ada', 'https://linkedin.com/in/ada'],
  ])('accepts the profile link %s and sends it as %s', async (linkedin, expected) => {
    const send = await loadAction();
    const result = await send(validForm({ linkedin }));
    expect(result.success).toBe(true);
    expect(getSendArgs().html).toContain(`href="${expected}"`);
  });

  it('accepts an application without a CV or optional fields', async () => {
    const send = await loadAction();
    const result = await send(validForm());
    expect(result.success).toBe(true);
    expect(getSendArgs().attachments).toBeUndefined();
  });

  it('treats an empty file input as no CV', async () => {
    const send = await loadAction();
    const result = await send(validForm({ cv: new File([], '') }));
    expect(result.success).toBe(true);
    expect(getSendArgs().attachments).toBeUndefined();
  });
});

describe('sendJobApplication — CV upload', () => {
  it('attaches a valid PDF with a sanitised filename', async () => {
    const send = await loadAction();
    const cv = new File([new Uint8Array(PDF_BYTES)], '../../My "CV".PDF');
    const result = await send(validForm({ cv }));
    expect(result.success).toBe(true);
    const [attachment] = getSendArgs().attachments!;
    expect(attachment.filename).toBe('My CV.pdf');
    expect(attachment.contentType).toBe('application/pdf');
    expect([...attachment.content]).toEqual(PDF_BYTES);
  });

  it('rejects a file over the size cap', async () => {
    const send = await loadAction();
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(PDF_BYTES);
    const result = await send(validForm({ cv: new File([big], 'cv.pdf') }));
    expect(result).toMatchObject({ success: false, code: 'file_too_large' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported extension', async () => {
    const send = await loadAction();
    const result = await send(validForm({ cv: new File(['hello'], 'cv.txt') }));
    expect(result).toMatchObject({ success: false, code: 'file_invalid' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a file whose bytes do not match its extension', async () => {
    const send = await loadAction();
    const result = await send(validForm({ cv: new File(['MZ fake exe'], 'cv.pdf') }));
    expect(result).toMatchObject({ success: false, code: 'file_invalid' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a string in place of a file', async () => {
    const send = await loadAction();
    const result = await send(validForm({ cv: 'cv.pdf' }));
    expect(result).toMatchObject({ success: false, code: 'file_invalid' });
  });
});

describe('sendJobApplication — email', () => {
  it('sends to the jobs inbox with Reply-To set to the applicant', async () => {
    const send = await loadAction();
    await send(validForm({ linkedin: 'https://linkedin.com/in/ada' }));
    const args = getSendArgs();
    expect(args.to).toBe('franciscoocostaa11@gmail.com');
    expect(args.replyTo).toBe('ada@example.com');
    expect(args.subject).toBe('Job application: Open Role — Ada Lovelace');
    expect(args.html).toContain('href="https://linkedin.com/in/ada"');
  });

  it('escapes user content in the HTML body', async () => {
    const send = await loadAction();
    await send(validForm({ firstName: '<script>x</script>', message: 'Tom & "Jerry"\n<b>' }));
    const args = getSendArgs();
    expect(args.html).not.toContain('<script>');
    expect(args.html).toContain('&lt;script&gt;');
    expect(args.html).toContain('Tom &amp; &quot;Jerry&quot;<br>&lt;b&gt;');
  });

  it('strips control characters from the subject', async () => {
    const send = await loadAction();
    await send(validForm({ lastName: 'Evil\r\nBcc: attacker@example.com' }));
    expect(getSendArgs().subject).not.toMatch(/[\x00-\x1F\x7F]/);
  });

  it('returns a generic send_failed error without leaking the Resend message', async () => {
    sendMock.mockResolvedValueOnce({ error: { message: 'internal upstream detail' }, data: null });
    const send = await loadAction();
    const result = await send(validForm());
    expect(result).toMatchObject({ success: false, code: 'send_failed' });
    expect(result.error).not.toContain('internal upstream detail');
  });
});
