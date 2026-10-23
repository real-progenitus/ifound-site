/**
 * Tests for the Resend `email.received` webhook that turns a reply to the
 * partners-only auto-reply into the usual "New Partner Inquiry" inbox email.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const TOKEN = '0123456789abcdef0123456789abcdef';

const sendMock = vi.fn();
const receivingGetMock = vi.fn();
const verifyMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock, receiving: { get: receivingGetMock } };
    webhooks = { verify: verifyMock };
  },
}));

const getMock = vi.fn();
const updateMock = vi.fn();
const docMock = vi.fn((id: string) => ({ id, get: getMock, update: updateMock }));
vi.mock('@/lib/firebase-admin', () => ({
  db: () => ({ collection: () => ({ doc: docMock }) }),
}));

// See sendPartnerEmail.test.ts: the real routing module can't load under vitest.
vi.mock('@/routing', () => ({
  routing: { locales: ['en', 'pt'], defaultLocale: 'en' },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

const inquiry = {
  company: 'Club Lux',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  message: 'We run a nightclub in Lisbon.',
  locale: 'en',
  status: 'awaiting_reply',
};

function receivedEvent(to: string[] = [`partners+${TOKEN}@reply.ifound.tech`]) {
  return {
    type: 'email.received',
    created_at: '2026-10-23T10:00:00Z',
    data: { email_id: 'em_1', from: 'Ada <ada@example.com>', to, cc: [], bcc: [], subject: 'Re: Your iFound partnership request' },
  };
}

function receivedEmail(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'em_1',
      from: 'Ada <ada@example.com>',
      text: 'Yes, we are a club with 2000 guests a night.\n\nOn Thu, iFound wrote:\n> Thanks for getting in touch with iFound.\n> iFound partnerships are only for...',
      html: null,
      headers: { 'Message-ID': '<abc@example.com>' },
      attachments: [],
      ...overrides,
    },
    error: null,
  };
}

async function post() {
  const { POST } = await import('../partner-reply/route');
  return POST(
    new NextRequest('http://localhost/api/partner-reply', {
      method: 'POST',
      body: '{"signed":"payload"}',
      headers: { 'svix-id': 'msg_1', 'svix-timestamp': '1761213600', 'svix-signature': 'v1,sig' },
    })
  );
}

beforeEach(() => {
  vi.resetModules();
  for (const m of [sendMock, receivingGetMock, verifyMock, getMock, updateMock]) m.mockReset();
  docMock.mockClear();
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  verifyMock.mockReturnValue(receivedEvent());
  getMock.mockResolvedValue({ exists: true, data: () => inquiry });
  receivingGetMock.mockResolvedValue(receivedEmail());
  sendMock.mockResolvedValue({ data: { id: 'sent_1' }, error: null });
  updateMock.mockResolvedValue(undefined);
});

describe('partner-reply webhook — authentication', () => {
  it('refuses to run without a signing secret', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await post();
    expect(res.status).toBe(500);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('rejects a bad signature without touching Firestore or sending', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = await post();
    expect(res.status).toBe(400);
    expect(docMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('verifies the raw body against the svix headers', async () => {
    await post();
    expect(verifyMock).toHaveBeenCalledWith({
      payload: '{"signed":"payload"}',
      headers: { id: 'msg_1', timestamp: '1761213600', signature: 'v1,sig' },
      webhookSecret: 'whsec_test',
    });
  });
});

describe('partner-reply webhook — mail it ignores (200, so Resend does not retry)', () => {
  it('ignores events other than email.received', async () => {
    verifyMock.mockReturnValue({ type: 'email.delivered', data: {} });
    const res = await post();
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('ignores mail without an inquiry token', async () => {
    verifyMock.mockReturnValue(receivedEvent(['hello@reply.ifound.tech']));
    const res = await post();
    expect(res.status).toBe(200);
    expect(docMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('ignores a token with no stored inquiry', async () => {
    getMock.mockResolvedValue({ exists: false, data: () => undefined });
    const res = await post();
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('ignores out-of-office and other automated replies', async () => {
    receivingGetMock.mockResolvedValue(receivedEmail({ headers: { 'Auto-Submitted': 'auto-replied' } }));
    const res = await post();
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('partner-reply webhook — forwarding a reply', () => {
  it('sends the usual inquiry email to the inbox with the reply appended', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(docMock).toHaveBeenCalledWith(TOKEN);
    expect(receivingGetMock).toHaveBeenCalledWith('em_1');

    const [email, options] = sendMock.mock.calls[0];
    expect(email.to).toBe('joaoalvaromota@gmail.com');
    expect(email.replyTo).toBe('ada@example.com');
    expect(email.subject).toBe('New Partner Inquiry from Club Lux');
    expect(email.text).toContain('We run a nightclub in Lisbon.');
    expect(email.text).toContain('Yes, we are a club with 2000 guests a night.');
    // The quoted copy of our own auto-reply is dropped.
    expect(email.text).not.toContain('> Thanks for getting in touch');
    expect(options).toEqual({ idempotencyKey: 'partner-reply/em_1' });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'forwarded' }));
  });

  it('finds the token in a display-name recipient and in any letter case', async () => {
    verifyMock.mockReturnValue(receivedEvent([`iFound <PARTNERS+${TOKEN.toUpperCase()}@reply.ifound.tech>`]));
    await post();
    expect(docMock).toHaveBeenCalledWith(TOKEN);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('flattens an HTML-only reply and escapes it in the inbox email', async () => {
    receivingGetMock.mockResolvedValue(
      receivedEmail({
        text: null,
        html: '<div>We host <b>events</b> &amp; parties<br>Call us</div><blockquote>Thanks for getting in touch</blockquote><script>x</script>',
      })
    );
    await post();
    const [email] = sendMock.mock.calls[0];
    expect(email.text).toContain('We host events & parties\nCall us');
    expect(email.text).not.toContain('Thanks for getting in touch');
    expect(email.html).toContain('We host events &amp; parties<br>Call us');
    expect(email.html).not.toContain('<script>');
  });

  it('notes when the reply came from another address or had attachments', async () => {
    receivingGetMock.mockResolvedValue(
      receivedEmail({ from: 'Bob <bob@clublux.pt>', attachments: [{ id: 'a1' }] })
    );
    await post();
    const [email] = sendMock.mock.calls[0];
    expect(email.text).toContain('(from Bob <bob@clublux.pt>)');
    expect(email.text).toContain('1 attachment(s)');
  });

  it('returns 500 so Resend retries when the inbox send fails, without marking it forwarded', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'upstream' } });
    const res = await post();
    expect(res.status).toBe(500);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
