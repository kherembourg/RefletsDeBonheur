import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AccountStep, type AccountData } from '../steps/AccountStep';

describe('AccountStep', () => {
  const defaultData: AccountData = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  const mockOnChange = vi.fn();
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <AccountStep data={defaultData} onChange={mockOnChange} onNext={mockOnNext} />
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('calls onChange when email is entered', () => {
    render(
      <AccountStep data={defaultData} onChange={mockOnChange} onNext={mockOnNext} />
    );

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultData,
      email: 'test@example.com',
    });
  });

  it('shows error for invalid email format', async () => {
    const { container } = render(
      <AccountStep
        data={{ email: 'invalid', password: 'password123', confirmPassword: 'password123' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
      />
    );

    const form = container.querySelector('form')!;

    // Submit the form directly
    await act(async () => {
      fireEvent.submit(form);
    });

    // The error message should now be visible
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('shows error for short password', () => {
    render(
      <AccountStep
        data={{ email: 'test@example.com', password: 'short', confirmPassword: 'short' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', () => {
    render(
      <AccountStep
        data={{ email: 'test@example.com', password: 'password123', confirmPassword: 'different' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('calls onNext with valid data', () => {
    render(
      <AccountStep
        data={{ email: 'test@example.com', password: 'password123', confirmPassword: 'password123' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('displays API errors passed via props', () => {
    render(
      <AccountStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        errors={{ email: 'An account with this email already exists.' }}
      />
    );

    expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
  });

  it('has link to sign in page', () => {
    render(
      <AccountStep data={defaultData} onChange={mockOnChange} onNext={mockOnNext} />
    );

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/connexion');
  });

  it('toggles password visibility', () => {
    render(
      <AccountStep data={defaultData} onChange={mockOnChange} onNext={mockOnNext} />
    );

    const passwordInput = screen.getByPlaceholderText('At least 8 characters');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find and click the toggle button (first one for password)
    const toggleButtons = screen.getAllByRole('button');
    const passwordToggle = toggleButtons.find(btn => btn.getAttribute('tabindex') === '-1');
    if (passwordToggle) {
      fireEvent.click(passwordToggle);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});
