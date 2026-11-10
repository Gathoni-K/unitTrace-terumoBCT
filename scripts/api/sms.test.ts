import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { sendSms } from './sms.js';

describe('Outbound SMS Utility (sendSms)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.AFRICASTALKING_API_KEY = 'test-api-key';
    process.env.AFRICASTALKING_USERNAME = 'test-username';
    delete process.env.AFRICASTALKING_SENDER_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('successfully sends SMS via Africa Talking endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          SMSMessageData: {
            Recipients: [{ number: '+254712345678', status: 'Success', statusCode: 101 }],
          },
        }),
      ),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendSms('+254712345678', 'Task 41 accepted.');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.africastalking.com/version1/messaging');
    expect(options.method).toBe('POST');
    expect(options.headers.apiKey).toBe('test-api-key');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const bodyParams = new URLSearchParams(options.body);
    expect(bodyParams.get('username')).toBe('test-username');
    expect(bodyParams.get('to')).toBe('+254712345678');
    expect(bodyParams.get('message')).toBe('Task 41 accepted.');
    expect(bodyParams.has('from')).toBe(false);
  });

  it('includes sender ID when AFRICASTALKING_SENDER_ID is configured', async () => {
    process.env.AFRICASTALKING_SENDER_ID = 'UNITTRACE';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'Success' })),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendSms('+254712345678', 'Hello from sender ID');

    expect(result.success).toBe(true);
    const [, options] = mockFetch.mock.calls[0];
    const bodyParams = new URLSearchParams(options.body);
    expect(bodyParams.get('from')).toBe('UNITTRACE');
  });

  it('handles AT API error gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Unauthorized' })),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendSms('+254712345678', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('handles network failure gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendSms('+254712345678', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network offline');
  });

  it('returns failure when AFRICASTALKING_API_KEY is not defined', async () => {
    delete process.env.AFRICASTALKING_API_KEY;

    const result = await sendSms('+254712345678', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('AFRICASTALKING_API_KEY is not defined');
  });
});
