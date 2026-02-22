export { isEmailConfigured, getResendClient, getSenderEmail } from './client';
export { sendWelcomeEmail, sendPaymentConfirmationEmail } from './service';
export type { SendEmailResult } from './service';
export type { WelcomeEmailData, PaymentConfirmationData } from './templates';
export { escapeHtml, generateWelcomeEmail, generatePaymentConfirmationEmail } from './templates';
