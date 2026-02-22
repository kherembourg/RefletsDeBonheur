import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before imports
vi.mock('../client', () => ({
  isEmailConfigured: vi.fn(),
  getResendClient: vi.fn(),
  getSenderEmail: vi.fn().mockReturnValue('Test <noreply@test.com>'),
}));

vi.mock('../templates', () => ({
  generateWelcomeEmail: vi.fn().mockReturnValue({
    subject: 'Welcome!',
    html: '<html>Welcome</html>',
  }),
  generatePaymentConfirmationEmail: vi.fn().mockReturnValue({
    subject: 'Payment Confirmed',
    html: '<html>Payment</html>',
  }),
}));

describe('Email Service', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    const defaultData = {
      coupleNames: 'Alice & Bob',
      email: 'alice@example.com',
      slug: 'alice-bob',
      magicLink: 'https://example.com/magic',
      guestCode: 'ABC123',
      lang: 'fr' as const,
    };

    it('sends welcome email successfully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const { sendWelcomeEmail } = await import('../service');
      const result = await sendWelcomeEmail(defaultData);

      expect(result.success).toBe(true);
      expect(result.id).toBe('email-123');
      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <noreply@test.com>',
        to: 'alice@example.com',
        subject: 'Welcome!',
        html: '<html>Welcome</html>',
      });
    });

    it('returns error when email service is not configured', async () => {
      const { isEmailConfigured } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(false);

      const { sendWelcomeEmail } = await import('../service');
      const result = await sendWelcomeEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
    });

    it('handles Resend API errors gracefully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', name: 'rate_limit_exceeded' },
      });
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendWelcomeEmail } = await import('../service');
      const result = await sendWelcomeEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');

      consoleErrorSpy.mockRestore();
    });

    it('handles unexpected exceptions gracefully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockRejectedValue(new Error('Network timeout'));
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendWelcomeEmail } = await import('../service');
      const result = await sendWelcomeEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');

      consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exceptions', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockRejectedValue('String error');
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendWelcomeEmail } = await import('../service');
      const result = await sendWelcomeEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');

      consoleErrorSpy.mockRestore();
    });

    it('logs success with email id', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockResolvedValue({ data: { id: 'msg-456' }, error: null });
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendWelcomeEmail } = await import('../service');
      await sendWelcomeEmail(defaultData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('alice@example.com')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('sendPaymentConfirmationEmail', () => {
    const defaultData = {
      coupleNames: 'Alice & Bob',
      email: 'alice@example.com',
      amount: '€199.00',
      lang: 'fr' as const,
    };

    it('sends payment confirmation email successfully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockResolvedValue({ data: { id: 'pay-123' }, error: null });
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const { sendPaymentConfirmationEmail } = await import('../service');
      const result = await sendPaymentConfirmationEmail(defaultData);

      expect(result.success).toBe(true);
      expect(result.id).toBe('pay-123');
      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <noreply@test.com>',
        to: 'alice@example.com',
        subject: 'Payment Confirmed',
        html: '<html>Payment</html>',
      });
    });

    it('returns error when email service is not configured', async () => {
      const { isEmailConfigured } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(false);

      const { sendPaymentConfirmationEmail } = await import('../service');
      const result = await sendPaymentConfirmationEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
    });

    it('handles Resend API errors gracefully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid sender', name: 'validation_error' },
      });
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendPaymentConfirmationEmail } = await import('../service');
      const result = await sendPaymentConfirmationEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid sender');

      consoleErrorSpy.mockRestore();
    });

    it('handles unexpected exceptions gracefully', async () => {
      const { isEmailConfigured, getResendClient } = await import('../client');
      (isEmailConfigured as any).mockReturnValue(true);
      mockSend.mockRejectedValue(new Error('DNS resolution failed'));
      (getResendClient as any).mockReturnValue({ emails: { send: mockSend } });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendPaymentConfirmationEmail } = await import('../service');
      const result = await sendPaymentConfirmationEmail(defaultData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DNS resolution failed');

      consoleErrorSpy.mockRestore();
    });
  });
});
