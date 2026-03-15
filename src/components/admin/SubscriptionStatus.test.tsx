import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SubscriptionStatus } from './SubscriptionStatus';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockLocation = {
  href: '',
  origin: 'http://localhost:4321',
  pathname: '/mariage/admin',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  describe('demo mode', () => {
    it('renders the trial experience without calling the API', async () => {
      render(<SubscriptionStatus profileId="test-profile" demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Essai gratuit')).toBeInTheDocument();
        expect(screen.getByText('30 jours restants')).toBeInTheDocument();
        expect(screen.getByText('Mode essai gratuit')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeDisabled();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('subscription fetch', () => {
    it('loads subscription status without a client token header', async () => {
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

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Essai gratuit')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/subscription?profileId=test-profile-123');
      expect(mockFetch.mock.calls[0][1]).toBeUndefined();
    });

    it('renders active and cancelled states from the API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'active',
          trialEndsAt: null,
          currentPeriodEnd: new Date().toISOString(),
          cancelAtPeriodEnd: true,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          daysRemaining: 30,
          isTrialExpired: false,
          canUploadToCloud: true,
        }),
      });

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByText('Prochain renouvellement')).toBeInTheDocument();
        expect(screen.getByText('Annulation programmée')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Gérer mon abonnement/i })).toBeInTheDocument();
      });
    });

    it('shows an error when loading fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Impossible de charger les informations d'abonnement/i)).toBeInTheDocument();
      });
    });
  });

  describe('checkout flow', () => {
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

    it('calls checkout without an auth header and redirects to Stripe', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Passer au forfait complet/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Passer au forfait complet/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stripe/checkout',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const checkoutCall = mockFetch.mock.calls[1];
      expect(checkoutCall[1].headers).not.toHaveProperty('x-client-token');
      expect(mockLocation.href).toBe('https://checkout.stripe.com/pay/cs_123');
    });

    it('shows a checkout error when the API rejects the request', async () => {
      mockFetch
        .mockReset()
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

      fireEvent.click(screen.getByRole('button', { name: /Passer au forfait complet/i }));

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors de la création de la session de paiement/i)).toBeInTheDocument();
      });
    });
  });

  describe('portal flow', () => {
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

    it('calls the portal endpoint without an auth header and redirects', async () => {
      render(<SubscriptionStatus profileId="test-profile-123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Gérer mon abonnement/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Gérer mon abonnement/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stripe/portal',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const portalCall = mockFetch.mock.calls[1];
      expect(portalCall[1].headers).not.toHaveProperty('x-client-token');
      expect(mockLocation.href).toBe('https://billing.stripe.com/session/abc123');
    });
  });

  describe('loading state', () => {
    it('renders the loading indicator while waiting for the API', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<SubscriptionStatus profileId="test-profile-123" />);

      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });
  });
});
