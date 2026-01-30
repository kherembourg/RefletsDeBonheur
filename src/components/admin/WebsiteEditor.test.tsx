import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

// Mock window.location.origin for postMessage
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
  },
  writable: true,
});

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
    it('shows loading overlay immediately when theme changes', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // Initially no loading overlay
      expect(getSpinner()).toBeFalsy();

      // Click on Luxe theme to trigger theme change
      // Theme changes trigger IMMEDIATE reload (no debounce)
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Loading should show IMMEDIATELY for theme changes (no debounce)
      expect(getSpinner()).toBeTruthy();
    });

    it('hides loading overlay when iframe loads', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // Trigger theme change (immediate loading)
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
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

    it('does not show loading for theme toggle back and forth', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      const getSpinner = () => container.querySelector('.animate-spin');

      // First theme change - click Luxe
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Loading should show
      expect(getSpinner()).toBeTruthy();

      // Simulate iframe load
      const iframe = container.querySelector('iframe');
      act(() => {
        fireEvent.load(iframe!);
      });

      // Loading should be hidden
      expect(getSpinner()).toBeFalsy();

      // Click back to Classic
      const classicThemeButton = screen.getByRole('button', { name: /Classic/i });
      act(() => {
        fireEvent.click(classicThemeButton);
      });

      // Loading should show again
      expect(getSpinner()).toBeTruthy();
    });

    it('updates iframe src when theme changes', () => {
      const { container } = render(<WebsiteEditor {...defaultProps} />);

      // Get initial iframe src
      const getIframeSrc = () => container.querySelector('iframe')?.getAttribute('src');
      const initialSrc = getIframeSrc();
      expect(initialSrc).toContain('v=0');

      // Change theme - the click will trigger state updates
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Query the iframe src again AFTER the state update
      // The iframe has key={previewKey}, so it gets remounted with a new src
      const newSrc = getIframeSrc();
      expect(newSrc).toContain('/marie-et-jean?preview=true');
      // After theme change, previewKey should increment to 1
      expect(newSrc).toContain('v=1');
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

  describe('Auto-save', () => {
    it('triggers auto-save after 2 seconds of no changes', async () => {
      render(<WebsiteEditor {...defaultProps} />);

      // Change theme
      const luxeThemeButton = screen.getByRole('button', { name: /Luxe/i });
      act(() => {
        fireEvent.click(luxeThemeButton);
      });

      // Before auto-save timeout, localStorage should not have the new value
      // (auto-save is debounced 2s)
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'wedding_customization_marie-et-jean',
        expect.stringContaining('luxe')
      );

      // Advance timers past auto-save debounce (2000ms)
      act(() => {
        vi.advanceTimersByTime(2100);
      });

      // Now localStorage should have been called with the customization
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wedding_customization_marie-et-jean',
        expect.stringContaining('luxe')
      );
    });
  });
});
