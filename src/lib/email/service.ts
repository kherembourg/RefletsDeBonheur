import { getResendClient, getSenderEmail, isEmailConfigured } from './client';
import { generateWelcomeEmail, generatePaymentConfirmationEmail } from './templates';
import type { WelcomeEmailData, PaymentConfirmationData } from './templates';

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send welcome email to new users after account creation
 *
 * This is a non-blocking operation - email failure should not prevent account creation.
 * Errors are logged but not thrown.
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.warn('[Email] Resend not configured, skipping welcome email for:', data.email);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const resend = getResendClient();
    const { subject, html } = generateWelcomeEmail(data);

    const result = await resend.emails.send({
      from: getSenderEmail(),
      to: data.email,
      subject,
      html,
    });

    if (result.error) {
      console.error('[Email] Failed to send welcome email:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Welcome email sent to ${data.email}, id: ${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Unexpected error sending welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send payment confirmation email after successful Stripe checkout
 *
 * This is a non-blocking operation - email failure should not affect payment processing.
 * Errors are logged but not thrown.
 */
export async function sendPaymentConfirmationEmail(data: PaymentConfirmationData): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.warn('[Email] Resend not configured, skipping payment confirmation for:', data.email);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const resend = getResendClient();
    const { subject, html } = generatePaymentConfirmationEmail(data);

    const result = await resend.emails.send({
      from: getSenderEmail(),
      to: data.email,
      subject,
      html,
    });

    if (result.error) {
      console.error('[Email] Failed to send payment confirmation:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Payment confirmation sent to ${data.email}, id: ${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Unexpected error sending payment confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
