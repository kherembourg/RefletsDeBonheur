import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock Stripe constructor
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return { customers: { create: vi.fn() } };
    }),
  };
});

// Import the module directly (not dynamic import since the stripe client is a singleton)
import {
  isStripeConfigured,
  getStripeClient,
  getStripeWebhookSecret,
  getStripePublishableKey,
  PRODUCT_CONFIG,
  STRIPE_PRICES,
} from './server';

describe('stripe/server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isStripeConfigured', () => {
    it('returns true when STRIPE_SECRET_KEY starts with sk_', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc123');
      expect(isStripeConfigured()).toBe(true);
      vi.unstubAllEnvs();
    });

    it('returns false when STRIPE_SECRET_KEY is empty', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      expect(isStripeConfigured()).toBe(false);
      vi.unstubAllEnvs();
    });

    it('returns false when STRIPE_SECRET_KEY does not start with sk_', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'pk_test_abc123');
      expect(isStripeConfigured()).toBe(false);
      vi.unstubAllEnvs();
    });
  });

  describe('getStripeClient', () => {
    it('returns a Stripe client instance', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_valid_key');
      const client = getStripeClient();
      expect(client).toBeDefined();
      vi.unstubAllEnvs();
    });

    it('returns the same singleton instance on repeated calls', () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_valid_key');
      const client1 = getStripeClient();
      const client2 = getStripeClient();
      expect(client1).toBe(client2);
      vi.unstubAllEnvs();
    });
  });

  describe('getStripeWebhookSecret', () => {
    it('throws when STRIPE_WEBHOOK_SECRET is not set', () => {
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
      expect(() => getStripeWebhookSecret()).toThrow('Stripe webhook secret not configured');
      vi.unstubAllEnvs();
    });

    it('returns the webhook secret when configured', () => {
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret');
      expect(getStripeWebhookSecret()).toBe('whsec_test_secret');
      vi.unstubAllEnvs();
    });
  });

  describe('getStripePublishableKey', () => {
    it('throws when STRIPE_PUBLISHABLE_KEY is not set', () => {
      vi.stubEnv('STRIPE_PUBLISHABLE_KEY', '');
      expect(() => getStripePublishableKey()).toThrow('Stripe publishable key not configured');
      vi.unstubAllEnvs();
    });

    it('returns the publishable key when configured', () => {
      vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_publishable');
      expect(getStripePublishableKey()).toBe('pk_test_publishable');
      vi.unstubAllEnvs();
    });
  });

  describe('PRODUCT_CONFIG', () => {
    it('exports product config with expected fields', () => {
      expect(PRODUCT_CONFIG).toHaveProperty('name');
      expect(PRODUCT_CONFIG).toHaveProperty('description');
      expect(PRODUCT_CONFIG).toHaveProperty('initialPrice');
      expect(PRODUCT_CONFIG).toHaveProperty('renewalPrice');
      expect(PRODUCT_CONFIG.initialPrice).toBe(19900); // $199 in cents
      expect(PRODUCT_CONFIG.renewalPrice).toBe(1999);  // $19.99 in cents
    });
  });

  describe('STRIPE_PRICES', () => {
    it('exports STRIPE_PRICES with price IDs', () => {
      expect(STRIPE_PRICES).toHaveProperty('INITIAL_2_YEARS');
      expect(STRIPE_PRICES).toHaveProperty('YEARLY_RENEWAL');
    });
  });
});
