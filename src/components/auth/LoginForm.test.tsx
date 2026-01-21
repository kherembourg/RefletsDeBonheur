/**
 * LoginForm Component Tests
 * Tests the authentication login form
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

// Auth codes (hardcoded to avoid import issues with mocking)
const GUEST_CODE = 'MARIAGE2026';
const ADMIN_CODE = 'ADMIN123';

// Mock the auth module
vi.mock('../../lib/auth', () => ({
  authenticate: vi.fn((code: string) => {
    const upperCode = code.toUpperCase();
    if (upperCode === 'ADMIN123') {
      return { success: true, isAdmin: true };
    }
    if (upperCode === 'MARIAGE2026') {
      return { success: true, isAdmin: false };
    }
    return { success: false, isAdmin: false };
  }),
}));

describe('LoginForm Component', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    (window as any).location = originalLocation;
  });

  describe('Rendering', () => {
    it('should render the login form', () => {
      render(<LoginForm />);

      expect(screen.getByText('Bienvenue')).toBeInTheDocument();
      expect(screen.getByText(/Entrez le code invité/)).toBeInTheDocument();
    });

    it('should render code input field', () => {
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render submit button', () => {
      render(<LoginForm />);

      const button = screen.getByRole('button', { name: 'Entrer' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should render demo code buttons', () => {
      render(<LoginForm />);

      expect(screen.getByText('MARIAGE2026')).toBeInTheDocument();
      expect(screen.getByText('ADMIN123')).toBeInTheDocument();
    });

    it('should render camera icon', () => {
      const { container } = render(<LoginForm />);

      // Camera icon should be present (lucide-react renders as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Input Behavior', () => {
    it('should update input value on change', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, 'TESTCODE');

      expect(input).toHaveValue('TESTCODE');
    });

    it('should convert input to uppercase visually', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, 'testcode');

      // Input has uppercase CSS, but value is lowercase
      // The authenticate function handles uppercase conversion
      expect(input).toHaveValue('testcode');
    });
  });

  describe('Demo Code Buttons', () => {
    it('should set guest code when guest button clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const guestButton = screen.getByText('MARIAGE2026');
      await user.click(guestButton);

      const input = screen.getByPlaceholderText("Code d'accès");
      expect(input).toHaveValue('MARIAGE2026');
    });

    it('should set admin code when admin button clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const adminButton = screen.getByText('ADMIN123');
      await user.click(adminButton);

      const input = screen.getByPlaceholderText("Code d'accès");
      expect(input).toHaveValue('ADMIN123');
    });
  });

  describe('Form Submission', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, GUEST_CODE);

      const submitButton = screen.getByRole('button', { name: 'Entrer' });
      fireEvent.click(submitButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Vérification...')).toBeInTheDocument();
      });
    });

    it('should disable input during submission', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, GUEST_CODE);

      const submitButton = screen.getByRole('button', { name: 'Entrer' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });

    it('should redirect on successful login with guest code', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, GUEST_CODE);

      const submitButton = screen.getByRole('button', { name: 'Entrer' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/gallery');
      });
    });

    it('should redirect on successful login with admin code', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, ADMIN_CODE);

      const submitButton = screen.getByRole('button', { name: 'Entrer' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/gallery');
      });
    });

    it('should show error on invalid code', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, 'INVALID');

      const submitButton = screen.getByRole('button', { name: 'Entrer' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Code incorrect. Veuillez réessayer.')).toBeInTheDocument();
      });
    });

    it('should clear error on new submission', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // First, trigger an error
      const input = screen.getByPlaceholderText("Code d'accès");
      await user.type(input, 'INVALID');
      fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));

      await waitFor(() => {
        expect(screen.getByText('Code incorrect. Veuillez réessayer.')).toBeInTheDocument();
      });

      // Clear and type new code
      await user.clear(input);
      await user.type(input, GUEST_CODE);
      fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));

      // Error should be gone during loading
      await waitFor(() => {
        expect(screen.queryByText('Code incorrect. Veuillez réessayer.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require code input', () => {
      render(<LoginForm />);

      const input = screen.getByPlaceholderText("Code d'accès");
      expect(input).toHaveAttribute('required');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      const { container } = render(<LoginForm />);

      // Forms without an accessible name don't expose the form role
      // So we query the DOM directly
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have submit button as type submit', () => {
      render(<LoginForm />);

      const button = screen.getByRole('button', { name: 'Entrer' });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });
});
