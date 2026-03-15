import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrivateGalleryQA } from './PrivateGalleryQA';

const resetDemoMock = vi.fn();

vi.mock('../../lib/demoStorage', () => ({
  resetDemo: () => resetDemoMock(),
}));

vi.mock('../gallery/GalleryGrid', () => ({
  GalleryGrid: () => <div data-testid="qa-gallery-grid">Gallery grid</div>,
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: { value: string; size: number }) => (
    <svg data-testid="qr-svg" data-value={props.value} data-size={props.size} />
  ),
}));

describe('PrivateGalleryQA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/qa-privee');

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    Object.defineProperty(window.location, 'reload', {
      value: vi.fn(),
      configurable: true,
    });
  });

  it('renders the lock screen by default', async () => {
    render(<PrivateGalleryQA />);

    expect(await screen.findByText("Galerie de validation avant release")).toBeInTheDocument();
    expect(screen.queryByTestId('qa-gallery-grid')).not.toBeInTheDocument();
  });

  it('unlocks the QA space with password 1412', async () => {
    render(<PrivateGalleryQA />);

    fireEvent.change(await screen.findByLabelText("Entrer le code pour ouvrir l'espace QA"), {
      target: { value: '1412' },
    });
    fireEvent.click(screen.getByText("Ouvrir l'espace"));

    expect(await screen.findByTestId('qa-gallery-grid')).toBeInTheDocument();
    expect(localStorage.getItem('reflets_qa_private_gallery_access')).toBe('granted');
  });

  it('builds the QR code URL with the private pin', async () => {
    render(<PrivateGalleryQA />);

    expect(await screen.findByTestId('qr-svg')).toHaveAttribute(
      'data-value',
      'http://localhost:4321/qa-privee?pin=1412'
    );
  });

  it('resets local QA data', async () => {
    localStorage.setItem('reflets_qa_private_gallery_access', 'granted');
    localStorage.setItem('reflets_username', 'Kevin');
    localStorage.setItem('reflets_favorites', '["1"]');

    render(<PrivateGalleryQA />);

    fireEvent.click(await screen.findByText('Reset QA'));
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));

    await waitFor(() => {
      expect(resetDemoMock).toHaveBeenCalled();
      expect(localStorage.getItem('reflets_username')).toBeNull();
      expect(localStorage.getItem('reflets_favorites')).toBeNull();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });
});
