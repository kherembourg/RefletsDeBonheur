import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before any imports
vi.mock('resend', () => {
  const MockResend = vi.fn(function (this: any, apiKey: string) {
    this.emails = { send: vi.fn() };
    this._apiKey = apiKey;
  });
  return { Resend: MockResend };
});

describe('Email Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to get fresh instances
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isEmailConfigured', () => {
    it('returns true when RESEND_API_KEY starts with re_', async () => {
      vi.stubEnv('RESEND_API_KEY', 're_test_abc123');
      const { isEmailConfigured } = await import('../client');
      expect(isEmailConfigured()).toBe(true);
    });

    it('returns false when RESEND_API_KEY is empty', async () => {
      vi.stubEnv('RESEND_API_KEY', '');
      const { isEmailConfigured } = await import('../client');
      expect(isEmailConfigured()).toBe(false);
    });

    it('returns false when RESEND_API_KEY does not start with re_', async () => {
      vi.stubEnv('RESEND_API_KEY', 'invalid_key');
      const { isEmailConfigured } = await import('../client');
      expect(isEmailConfigured()).toBe(false);
    });

    it('returns false when RESEND_API_KEY is not set', async () => {
      vi.stubEnv('RESEND_API_KEY', undefined as any);
      const { isEmailConfigured } = await import('../client');
      expect(isEmailConfigured()).toBe(false);
    });
  });

  describe('getResendClient', () => {
    it('creates a Resend client with the API key', async () => {
      vi.stubEnv('RESEND_API_KEY', 're_test_valid_key');
      const { getResendClient } = await import('../client');
      const { Resend } = await import('resend');

      const client = getResendClient();
      expect(Resend).toHaveBeenCalledWith('re_test_valid_key');
      expect(client).toBeDefined();
      expect(client.emails).toBeDefined();
    });

    it('throws when API key is not configured', async () => {
      vi.stubEnv('RESEND_API_KEY', '');
      const { getResendClient } = await import('../client');

      expect(() => getResendClient()).toThrow('Resend API key not configured');
    });

    it('returns singleton instance on subsequent calls', async () => {
      vi.stubEnv('RESEND_API_KEY', 're_test_singleton_key');
      const { getResendClient } = await import('../client');

      const client1 = getResendClient();
      const client2 = getResendClient();
      expect(client1).toBe(client2);
    });
  });

  describe('getSenderEmail', () => {
    it('returns configured sender email', async () => {
      vi.stubEnv('RESEND_FROM_EMAIL', 'Test <test@example.com>');
      const { getSenderEmail } = await import('../client');
      expect(getSenderEmail()).toBe('Test <test@example.com>');
    });

    it('returns default sender when not configured', async () => {
      vi.stubEnv('RESEND_FROM_EMAIL', '');
      const { getSenderEmail } = await import('../client');
      expect(getSenderEmail()).toBe('Reflets de Bonheur <noreply@refletsdebonheur.com>');
    });
  });
});
