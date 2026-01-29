import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WebsiteEditor } from './WebsiteEditor';

// Mock child components to simplify testing
vi.mock('./ColorPaletteEditor', () => ({
  ColorPaletteEditor: () => <div data-testid="color-palette-editor">ColorPaletteEditor</div>,
}));

vi.mock('./ContentEditor', () => ({
  ContentEditor: () => <div data-testid="content-editor">ContentEditor</div>,
}));

vi.mock('./ImageManager', () => ({
  ImageManager: () => <div data-testid="image-manager">ImageManager</div>,
}));

// Mock themes
vi.mock('../../lib/themes', () => ({
  themeList: [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Elegant burgundy with timeless design',
      colors: {
        primary: '#ae1725',
        background: '#F5F0E8',
        text: '#333333',
        accent: '#B8860B',
      },
    },
    {
      id: 'luxe',
      name: 'Luxe',
      description: 'Minimalist gold accents',
      colors: {
        primary: '#B8860B',
        background: '#FFFFFF',
        text: '#1a1a1a',
        accent: '#D4AF37',
      },
    },
  ],
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('WebsiteEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const defaultProps = {
    weddingId: 'test-wedding-id',
    weddingSlug: 'marie-et-jean',
    demoMode: true,
  };

  describe('Live Preview', () => {
    it('does not show loading overlay before debounce timeout', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // Initially no loading overlay
      expect(getSpinner()).toBeFalsy();

      // Click on Luxe theme to trigger customization change
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Advance timers by 499ms - loading should NOT show yet (within debounce)
      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(getSpinner()).toBeFalsy();
    });

    it('shows loading overlay after 500ms debounce when customization changes', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // Initially no loading overlay
      expect(getSpinner()).toBeFalsy();

      // Trigger a customization change
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Advance past debounce time to trigger reload
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Loading overlay should be visible (previewKey incremented, loading = true)
      expect(getSpinner()).toBeTruthy();
    });

    it('hides loading overlay when iframe loads', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // Trigger customization change
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Loading should be showing
      expect(getSpinner()).toBeTruthy();

      // Simulate iframe load event
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();

      act(() => {
        fireEvent.load(iframe!);
      });

      // Loading overlay should be hidden
      expect(getSpinner()).toBeFalsy();
    });

    it('resets debounce timer when customization changes again', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // First customization change - click Luxe
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Wait 300ms (less than 500ms debounce)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // No spinner yet
      expect(getSpinner()).toBeFalsy();

      // Another click (should reset debounce timer)
      const classicThemeButton = screen.getByRole('button', { name: /Classic/i });
      act(() => {
        fireEvent.click(classicThemeButton);
      });

      // Wait another 300ms (600ms total from first click, but only 300ms from second)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Still no spinner (only 300ms since last change)
      expect(getSpinner()).toBeFalsy();

      // Wait remaining 200ms (500ms from second click)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now spinner should show (debounce completed from second change)
      expect(getSpinner()).toBeTruthy();
    });
  });

  describe('Basic Rendering', () => {
    it('renders editor with all tabs', () => {
      render(<WebsiteEditor {...defaultProps} />);

      expect(screen.getByText('Thèmes')).toBeTruthy();
      expect(screen.getByText('Couleurs')).toBeTruthy();
      expect(screen.getByText('Contenu')).toBeTruthy();
      expect(screen.getByText('Images')).toBeTruthy();
    });

    it('renders preview iframe with correct src', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('src')).toContain('/marie-et-jean?preview=true');
    });

    it('shows device preview controls', () => {
      render(<WebsiteEditor {...defaultProps} />);

      // Device preview buttons should be present
      expect(screen.getByTitle('Bureau')).toBeTruthy();
      expect(screen.getByTitle('Tablette')).toBeTruthy();
      expect(screen.getByTitle('Mobile')).toBeTruthy();
    });
  });
});
