import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Check if Stripe is configured with valid credentials
 */
export function isStripeConfigured(): boolean {
  const secretKey = import.meta.env.STRIPE_SECRET_KEY || '';
  return Boolean(secretKey && secretKey.startsWith('sk_'));
}

/**
 * Get the Stripe client instance (singleton)
 */
export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = import.meta.env.STRIPE_SECRET_KEY || '';

  if (!secretKey) {
    throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY in your environment.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia',
    typescript: true,
  });

  return stripeClient;
}

/**
 * Get the Stripe webhook secret
 */
export function getStripeWebhookSecret(): string {
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || '';
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET in your environment.');
  }
  return webhookSecret;
}

/**
 * Get the Stripe publishable key for client-side
 */
export function getStripePublishableKey(): string {
  const publishableKey = import.meta.env.STRIPE_PUBLISHABLE_KEY || '';
  if (!publishableKey) {
    throw new Error('Stripe publishable key not configured. Set STRIPE_PUBLISHABLE_KEY in your environment.');
  }
  return publishableKey;
}

// Price configuration - $199 for 2 years (initial), $19.99/year after
export const STRIPE_PRICES = {
  // One-time payment for 2 years access
  INITIAL_2_YEARS: 'price_initial_2_years', // $199
  // Yearly renewal after initial period
  YEARLY_RENEWAL: 'price_yearly_renewal', // $19.99/year
} as const;

// Product metadata
export const PRODUCT_CONFIG = {
  name: 'Reflets de Bonheur - Wedding Photo Platform',
  description: 'Unlimited photos & videos, wedding website, guestbook, and more.',
  initialPrice: 19900, // $199.00 in cents
  renewalPrice: 1999,  // $19.99 in cents
  initialPeriodYears: 2,
};
