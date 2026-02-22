import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTheme, setTheme, applyTheme, toggleTheme, initTheme, watchSystemTheme } from './theme';

describe('theme.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset classList
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('getTheme', () => {
    it('returns light theme by default', () => {
      expect(getTheme()).toBe('light');
    });

    it('returns stored light theme', () => {
      localStorage.setItem('reflets_theme', 'light');
      expect(getTheme()).toBe('light');
    });

    it('returns stored dark theme', () => {
      localStorage.setItem('reflets_theme', 'dark');
      expect(getTheme()).toBe('dark');
    });

    it('ignores invalid stored values and falls back to system preference', () => {
      localStorage.setItem('reflets_theme', 'blue'); // Invalid
      // matchMedia defaults to light in jsdom
      expect(getTheme()).toBe('light');
    });

    it('returns dark when system prefers dark and no stored preference', () => {
      // Mock matchMedia to return dark
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      const theme = getTheme();
      expect(theme).toBe('dark');

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('watchSystemTheme', () => {
    it('returns a cleanup function', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      const cleanup = watchSystemTheme(vi.fn());
      expect(typeof cleanup).toBe('function');
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      cleanup();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      window.matchMedia = originalMatchMedia;
    });

    it('calls callback when system theme changes and no stored preference', () => {
      let changeHandler: (e: { matches: boolean }) => void = () => {};
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn().mockImplementation((_event, handler) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      });
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      const callback = vi.fn();
      watchSystemTheme(callback);

      // Simulate system theme change to dark
      changeHandler({ matches: true });
      expect(callback).toHaveBeenCalledWith('dark');

      // Simulate system theme change to light
      changeHandler({ matches: false });
      expect(callback).toHaveBeenCalledWith('light');

      window.matchMedia = originalMatchMedia;
    });

    it('does not call callback when user has stored preference', () => {
      localStorage.setItem('reflets_theme', 'light');

      let changeHandler: (e: { matches: boolean }) => void = () => {};
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn().mockImplementation((_event, handler) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      });
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      const callback = vi.fn();
      watchSystemTheme(callback);

      // Trigger change - should not call callback since user has stored preference
      changeHandler({ matches: true });
      expect(callback).not.toHaveBeenCalled();

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('setTheme', () => {
    it('saves theme to localStorage', () => {
      setTheme('dark');
      expect(localStorage.getItem('reflets_theme')).toBe('dark');
    });

    it('applies the theme to the document', () => {
      setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class when setting light theme', () => {
      document.documentElement.classList.add('dark');
      setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('applyTheme', () => {
    it('adds dark class for dark theme', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class for light theme', () => {
      document.documentElement.classList.add('dark');
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      localStorage.setItem('reflets_theme', 'light');
      const result = toggleTheme();
      expect(result).toBe('dark');
      expect(localStorage.getItem('reflets_theme')).toBe('dark');
    });

    it('toggles from dark to light', () => {
      localStorage.setItem('reflets_theme', 'dark');
      const result = toggleTheme();
      expect(result).toBe('light');
      expect(localStorage.getItem('reflets_theme')).toBe('light');
    });

    it('updates the document class', () => {
      localStorage.setItem('reflets_theme', 'light');
      toggleTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('initTheme', () => {
    it('applies current theme on initialization', () => {
      localStorage.setItem('reflets_theme', 'dark');
      initTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('applies light theme when no preference stored', () => {
      initTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
