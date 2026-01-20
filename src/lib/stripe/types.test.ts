import { describe, it, expect } from 'vitest';
import { SUBSCRIPTION_STATUS_LABELS } from './types';
import type { SubscriptionInfo, CheckoutSessionRequest, CustomerPortalRequest } from './types';

describe('Stripe Types', () => {
  describe('SUBSCRIPTION_STATUS_LABELS', () => {
    it('should have trial status configuration', () => {
      expect(SUBSCRIPTION_STATUS_LABELS.trial).toBeDefined();
      expect(SUBSCRIPTION_STATUS_LABELS.trial.label).toBe('Essai gratuit');
      expect(SUBSCRIPTION_STATUS_LABELS.trial.color).toBe('text-amber-700');
      expect(SUBSCRIPTION_STATUS_LABELS.trial.bgColor).toBe('bg-amber-50 border-amber-200');
    });

    it('should have active status configuration', () => {
      expect(SUBSCRIPTION_STATUS_LABELS.active).toBeDefined();
      expect(SUBSCRIPTION_STATUS_LABELS.active.label).toBe('Actif');
      expect(SUBSCRIPTION_STATUS_LABELS.active.color).toBe('text-green-700');
      expect(SUBSCRIPTION_STATUS_LABELS.active.bgColor).toBe('bg-green-50 border-green-200');
    });

    it('should have expired status configuration', () => {
      expect(SUBSCRIPTION_STATUS_LABELS.expired).toBeDefined();
      expect(SUBSCRIPTION_STATUS_LABELS.expired.label).toBe('Expiré');
      expect(SUBSCRIPTION_STATUS_LABELS.expired.color).toBe('text-red-700');
      expect(SUBSCRIPTION_STATUS_LABELS.expired.bgColor).toBe('bg-red-50 border-red-200');
    });

    it('should have cancelled status configuration', () => {
      expect(SUBSCRIPTION_STATUS_LABELS.cancelled).toBeDefined();
      expect(SUBSCRIPTION_STATUS_LABELS.cancelled.label).toBe('Annulé');
      expect(SUBSCRIPTION_STATUS_LABELS.cancelled.color).toBe('text-gray-700');
      expect(SUBSCRIPTION_STATUS_LABELS.cancelled.bgColor).toBe('bg-gray-50 border-gray-200');
    });

    it('should have all four statuses', () => {
      const statuses = Object.keys(SUBSCRIPTION_STATUS_LABELS);
      expect(statuses).toHaveLength(4);
      expect(statuses).toContain('trial');
      expect(statuses).toContain('active');
      expect(statuses).toContain('expired');
      expect(statuses).toContain('cancelled');
    });
  });

  describe('SubscriptionInfo Type', () => {
    it('should accept valid trial subscription info', () => {
      const trialInfo: SubscriptionInfo = {
        status: 'trial',
        trialEndsAt: '2026-02-20T00:00:00Z',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        daysRemaining: 30,
        isTrialExpired: false,
        canUploadToCloud: false,
      };

      expect(trialInfo.status).toBe('trial');
      expect(trialInfo.canUploadToCloud).toBe(false);
    });

    it('should accept valid active subscription info', () => {
      const activeInfo: SubscriptionInfo = {
        status: 'active',
        trialEndsAt: null,
        currentPeriodEnd: '2028-01-20T00:00:00Z',
        cancelAtPeriodEnd: false,
        stripeCustomerId: 'cus_123456',
        stripeSubscriptionId: 'sub_123456',
        daysRemaining: 730,
        isTrialExpired: false,
        canUploadToCloud: true,
      };

      expect(activeInfo.status).toBe('active');
      expect(activeInfo.canUploadToCloud).toBe(true);
      expect(activeInfo.stripeCustomerId).toBe('cus_123456');
    });

    it('should accept valid expired subscription info', () => {
      const expiredInfo: SubscriptionInfo = {
        status: 'expired',
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: 'cus_123456',
        stripeSubscriptionId: null,
        daysRemaining: 0,
        isTrialExpired: true,
        canUploadToCloud: false,
      };

      expect(expiredInfo.status).toBe('expired');
      expect(expiredInfo.isTrialExpired).toBe(true);
    });

    it('should accept subscription with pending cancellation', () => {
      const cancellingInfo: SubscriptionInfo = {
        status: 'active',
        trialEndsAt: null,
        currentPeriodEnd: '2026-02-20T00:00:00Z',
        cancelAtPeriodEnd: true,
        stripeCustomerId: 'cus_123456',
        stripeSubscriptionId: 'sub_123456',
        daysRemaining: 30,
        isTrialExpired: false,
        canUploadToCloud: true,
      };

      expect(cancellingInfo.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('CheckoutSessionRequest Type', () => {
    it('should accept valid checkout session request', () => {
      const request: CheckoutSessionRequest = {
        profileId: 'profile-uuid-123',
        email: 'test@example.com',
        successUrl: 'http://localhost:4321/admin?payment=success',
        cancelUrl: 'http://localhost:4321/admin?payment=cancelled',
      };

      expect(request.profileId).toBe('profile-uuid-123');
      expect(request.email).toBe('test@example.com');
      expect(request.successUrl).toContain('success');
      expect(request.cancelUrl).toContain('cancelled');
    });
  });

  describe('CustomerPortalRequest Type', () => {
    it('should accept valid portal request', () => {
      const request: CustomerPortalRequest = {
        profileId: 'profile-uuid-123',
        returnUrl: 'http://localhost:4321/admin',
      };

      expect(request.profileId).toBe('profile-uuid-123');
      expect(request.returnUrl).toBe('http://localhost:4321/admin');
    });
  });
});
