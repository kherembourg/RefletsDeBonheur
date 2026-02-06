import { Resend } from 'resend';

let resendClient: Resend | null = null;

/**
 * Check if the email service (Resend) is configured
 */
export function isEmailConfigured(): boolean {
  const apiKey = import.meta.env.RESEND_API_KEY || '';
  return Boolean(apiKey && apiKey.startsWith('re_'));
}

/**
 * Get the Resend client instance (singleton)
 */
export function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = import.meta.env.RESEND_API_KEY || '';

  if (!apiKey) {
    throw new Error('Resend API key not configured. Set RESEND_API_KEY in your environment.');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Get the configured sender email address
 */
export function getSenderEmail(): string {
  return import.meta.env.RESEND_FROM_EMAIL || 'Reflets de Bonheur <noreply@refletsdebonheur.com>';
}
