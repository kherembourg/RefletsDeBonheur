import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from './ResetPasswordForm';

const { mockGetSession, mockOnAuthStateChange, mockUpdateUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      updateUser: mockUpdateUser,
    },
  },
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  it('updates password successfully', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(await screen.findByLabelText(/nouveau mot de passe/i), 'Password123');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /mettre à jour mon mot de passe/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Password123' });
    });

    expect(await screen.findByText(/mot de passe mis à jour/i)).toBeInTheDocument();
  });
});
