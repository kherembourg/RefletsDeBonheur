// Theme management utilities

const THEME_KEY = 'reflets_theme';

export type Theme = 'light' | 'dark';

// Get current theme from localStorage or system preference
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

// Save theme preference
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Toggle between light and dark
export function toggleTheme(): Theme {
  const current = getTheme();
  const newTheme: Theme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

// Initialize theme on page load
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}

// Listen for system theme changes
export function watchSystemTheme(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    // Only update if user hasn't set a manual preference
    if (!localStorage.getItem(THEME_KEY)) {
      const theme: Theme = e.matches ? 'dark' : 'light';
      applyTheme(theme);
      callback(theme);
    }
  };

  mediaQuery.addEventListener('change', handler);

  return () => mediaQuery.removeEventListener('change', handler);
}
