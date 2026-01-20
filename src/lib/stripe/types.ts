// ============================================
// Stripe Types for the Application
// ============================================

export interface SubscriptionInfo {
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  daysRemaining: number;
  isTrialExpired: boolean;
  canUploadToCloud: boolean;
}

export interface CheckoutSessionRequest {
  profileId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CustomerPortalRequest {
  profileId: string;
  returnUrl: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

// Subscription status display helpers
export const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  trial: {
    label: 'Essai gratuit',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  active: {
    label: 'Actif',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  expired: {
    label: 'Expiré',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
  },
};
