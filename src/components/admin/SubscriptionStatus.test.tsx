import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SubscriptionStatus } from './SubscriptionStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage for auth token
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue('mock-auth-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:4321',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('SubscriptionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
  });

  describe('Demo Mode', () => {
    it('should display trial status in demo mode', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Essai gratuit')).toBeInTheDocument();
      });
    });

    it('should show 30 days remaining in demo mode', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('30 jours restants')).toBeInTheDocument();
      });
    });

    it('should show trial limitations notice in demo mode', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Mode essai gratuit')).toBeInTheDocument();
        expect(screen.getByText(/Pendant l'essai, vos photos sont stockées localement/)).toBeInTheDocument();
      });
    });

    it('should show upgrade button in demo mode', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });
    });

    it('should disable upgrade button in demo mode', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Passer au forfait complet/i });
        expect(button).toBeDisabled();
      });
    });

    it('should display pricing info', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('199 €')).toBeInTheDocument();
        expect(screen.getByText(/pour 2 ans/)).toBeInTheDocument();
        expect(screen.getByText('19,99 €/an')).toBeInTheDocument();
      });
    });
  });

  describe('Production Mode - Trial Status', () => {
    beforeEach(() => {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'trial',
          trialEndsAt: trialEndDate.toISOString(),
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          daysRemaining: 15,
          isTrialExpired: false,
          canUploadToCloud: false,
        }),
      });
    });

    it('should fetch subscription status on mount with auth token', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stripe/subscription?profileId=test-profile-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-client-token': 'mock-auth-token',
            }),
          })
        );
      });
    });

    it('should display trial status from API', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Essai gratuit')).toBeInTheDocument();
      });
    });

    it('should show days remaining from API', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('15 jours restants')).toBeInTheDocument();
      });
    });

    it('should show upgrade button for trial users', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });
    });
  });

  describe('Production Mode - Active Status', () => {
    beforeEach(() => {
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 2);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'active',
          trialEndsAt: null,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          daysRemaining: 730,
          isTrialExpired: false,
          canUploadToCloud: true,
        }),
      });
    });

    it('should display active status', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Actif')).toBeInTheDocument();
      });
    });

    it('should show renewal date for active subscriptions', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Prochain renouvellement')).toBeInTheDocument();
      });
    });

    it('should show manage subscription button for active users', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Gérer mon abonnement/i })).toBeInTheDocument();
      });
    });

    it('should not show trial limitations for active users', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.queryByText('Mode essai gratuit')).not.toBeInTheDocument();
      });
    });
  });

  describe('Production Mode - Expired Status', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'expired',
          trialEndsAt: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: null,
          daysRemaining: 0,
          isTrialExpired: true,
          canUploadToCloud: false,
        }),
      });
    });

    it('should display expired status', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Expiré')).toBeInTheDocument();
      });
    });

    it('should show upgrade button for expired users', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });
    });
  });

  describe('Production Mode - Cancelled Status', () => {
    beforeEach(() => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'active',
          trialEndsAt: null,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: true,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          daysRemaining: 30,
          isTrialExpired: false,
          canUploadToCloud: true,
        }),
      });
    });

    it('should show cancellation notice when cancelAtPeriodEnd is true', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Annulation programmée')).toBeInTheDocument();
      });
    });
  });

  describe('Checkout Flow', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'trial',
            trialEndsAt: new Date().toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            daysRemaining: 30,
            isTrialExpired: false,
            canUploadToCloud: false,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sessionId: 'cs_123',
            url: 'https://checkout.stripe.com/pay/cs_123',
          }),
        });
    });

    it('should call checkout API when upgrade button clicked with auth token', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /Passer au forfait complet/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stripe/checkout', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-client-token': 'mock-auth-token',
          }),
        }));
      });
    });

    it('should redirect to Stripe checkout URL', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /Passer au forfait complet/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLocation.href).toBe('https://checkout.stripe.com/pay/cs_123');
      });
    });
  });

  describe('Portal Flow', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'active',
            trialEndsAt: null,
            currentPeriodEnd: new Date().toISOString(),
            cancelAtPeriodEnd: false,
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
            daysRemaining: 365,
            isTrialExpired: false,
            canUploadToCloud: true,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            url: 'https://billing.stripe.com/session/abc123',
          }),
        });
    });

    it('should call portal API when manage button clicked with auth token', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Gérer mon abonnement/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /Gérer mon abonnement/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-client-token': 'mock-auth-token',
          }),
        }));
      });
    });

    it('should redirect to Stripe billing portal', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Gérer mon abonnement/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /Gérer mon abonnement/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLocation.href).toBe('https://billing.stripe.com/session/abc123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Impossible de charger les informations d'abonnement/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Impossible de charger les informations d'abonnement/i)).toBeInTheDocument();
      });
    });

    it('should show error when checkout fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'trial',
            trialEndsAt: new Date().toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            daysRemaining: 30,
            isTrialExpired: false,
            canUploadToCloud: false,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Checkout failed' }),
        });

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /Passer au forfait complet/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors de la création de la session de paiement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SubscriptionStatus profileId="test-profile-123" />);

      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });
  });
});
