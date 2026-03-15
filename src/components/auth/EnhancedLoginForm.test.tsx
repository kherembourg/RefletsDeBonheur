import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedLoginForm } from './EnhancedLoginForm';

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  authenticate: vi.fn(() => ({ success: false })),
}));

vi.mock('../../lib/auth/clientAuth', () => ({
  clientLogin: vi.fn(),
  guestLogin: vi.fn(),
}));

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
}));

describe('EnhancedLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/connexion');
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it('requests password reset email when user clicks forgot password', async () => {
    const user = userEvent.setup();
    render(<EnhancedLoginForm />);

    await user.click(screen.getByRole('tab', { name: /espace client/i }));
    await user.type(screen.getByLabelText('Email'), 'marie@example.com');
    await user.click(screen.getByText(/mot de passe oublié/i));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled();
    });

    expect(await screen.findByText(/email de réinitialisation/i)).toBeInTheDocument();
  });
});
