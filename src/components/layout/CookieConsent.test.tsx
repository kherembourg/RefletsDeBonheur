import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CookieConsent } from './CookieConsent';
import { COOKIE_CONSENT_KEY } from '../../lib/gdpr';

describe('CookieConsent Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render the banner when no consent is stored', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/cookies essentiels/i)).toBeInTheDocument();
  });

  it('should not render when consent was already accepted', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when consent was already rejected', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should hide the banner and store "accepted" when Accept is clicked', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accepter'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
  });

  it('should hide the banner and store "rejected" when Refuse is clicked', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Refuser'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('rejected');
  });

  it('should render a link to the privacy policy', () => {
    render(<CookieConsent />);
    const link = screen.getByText(/politique de confidentialite/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/politique-confidentialite');
  });
});
