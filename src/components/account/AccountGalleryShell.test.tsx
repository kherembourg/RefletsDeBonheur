import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccountGalleryShell } from './AccountGalleryShell';

vi.mock('../gallery/GalleryGrid', () => ({
  GalleryGrid: ({ weddingSlug }: { weddingSlug?: string }) => (
    <div data-testid="gallery-grid" data-slug={weddingSlug || ''}>
      Gallery Grid
    </div>
  ),
}));

describe('AccountGalleryShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders fallback copy without session', () => {
    render(<AccountGalleryShell />);

    expect(screen.getAllByText('Votre galerie').length).toBeGreaterThan(0);
    expect(screen.getByText(/Galerie privée de votre mariage/)).toBeInTheDocument();
    expect(screen.getByTestId('gallery-grid')).toHaveAttribute('data-slug', '');
  });

  it('uses client session data when available', () => {
    localStorage.setItem('reflets_client_session', JSON.stringify({
      wedding_name: 'Mariage de Julie & Thomas',
      couple_names: 'Julie & Thomas',
      wedding_slug: 'julie-thomas',
    }));

    render(<AccountGalleryShell />);

    expect(screen.getAllByText('Julie & Thomas').length).toBeGreaterThan(0);
    expect(screen.getByTestId('gallery-grid')).toHaveAttribute('data-slug', 'julie-thomas');
    expect(screen.getByRole('link', { name: 'Livre d\'or' })).toHaveAttribute('href', '/julie-thomas/livre-or');
  });
});
