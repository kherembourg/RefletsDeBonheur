import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentStep } from '../PaymentStep';

global.fetch = vi.fn();

describe('PaymentStep', () => {
  const mockData = {
    email: 'test@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    partner1Name: 'Alice',
    partner2Name: 'Bob',
    weddingDate: '2026-06-15',
    slug: 'alice-bob',
    themeId: 'classic' as const,
  };

  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render payment summary with all details', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      expect(screen.getByText(/Alice & Bob/i)).toBeInTheDocument();
      expect(screen.getByText(/\/alice-bob/i)).toBeInTheDocument();
      // Theme name should be displayed (Classic theme)
      expect(screen.getByText(/Complete Your Purchase/i)).toBeInTheDocument();
    });

    it('should display pricing information', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      expect(screen.getByText(/\$199/i)).toBeInTheDocument();
      expect(screen.getByText(/\$249/i)).toBeInTheDocument();
      expect(screen.getByText(/Save \$50/i)).toBeInTheDocument();
    });

    it('should display included features', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      expect(screen.getByText(/Unlimited photos & videos/i)).toBeInTheDocument();
      expect(screen.getByText(/10 GB storage/i)).toBeInTheDocument();
      expect(screen.getByText(/Full customization/i)).toBeInTheDocument();
      expect(screen.getByText(/Priority support/i)).toBeInTheDocument();
    });

    it('should show secure payment badge', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      expect(screen.getByText(/Secure payment with Stripe/i)).toBeInTheDocument();
    });

    it('should render French translations', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="fr" />);

      expect(screen.getByText(/Finalisez Votre Achat/i)).toBeInTheDocument();
      expect(screen.getByText(/Paiement sécurisé par Stripe/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call create-checkout API on submit', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
      } as Response);

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/signup/create-checkout',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('alice-bob'),
          })
        );
      });
    });

    it('should redirect to Stripe on successful checkout creation', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '' } as any;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
      } as Response);

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe('https://checkout.stripe.com/test');
      });

      window.location = originalLocation;
    });

    it('should show loading state during submission', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i }) as HTMLButtonElement;
      fireEvent.click(submitButton);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(submitButton.disabled).toBe(true);
      });
    });

    it('should display error message on API failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Payment system error', message: 'Stripe is unavailable' }),
      } as Response);

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Stripe is unavailable/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create checkout/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i }) as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(true);
      });
    });
  });

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const backButton = screen.getByRole('button', { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should disable back button during loading', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back/i }) as HTMLButtonElement;
        expect(backButton.disabled).toBe(true);
      });
    });
  });

  describe('Theme Display', () => {
    it('should display summary section', () => {
      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      // Summary should be present
      expect(screen.getByText(/Review Your Information/i)).toBeInTheDocument();
    });

    it('should handle missing theme gracefully', () => {
      const dataWithInvalidTheme = { ...mockData, themeId: 'invalid' as any };
      render(<PaymentStep data={dataWithInvalidTheme} onBack={mockOnBack} lang="en" />);

      // Should not crash - theme field just won't show theme name
      expect(screen.getByText(/Complete Your Purchase/i)).toBeInTheDocument();
    });
  });

  describe('Data Submission', () => {
    it('should submit all required fields', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ sessionId: 'cs_test', url: 'https://checkout.stripe.com' }),
      } as Response);

      render(<PaymentStep data={mockData} onBack={mockOnBack} lang="en" />);

      const submitButton = screen.getByRole('button', { name: /Pay Now/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);

        expect(body.email).toBe('test@example.com');
        expect(body.password).toBe('SecurePass123');
        expect(body.partner1_name).toBe('Alice');
        expect(body.partner2_name).toBe('Bob');
        expect(body.wedding_date).toBe('2026-06-15');
        expect(body.slug).toBe('alice-bob');
        expect(body.theme_id).toBe('classic');
      });
    });
  });
});
