// Wedding Website Theme System

export type ThemeId = 'classic' | 'luxe';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  text: string;
  textLight: string;
  textMuted: string;
  border: string;
  card: string;
  glass: string;
}

export interface ThemeTypography {
  fontDisplay: string;
  fontBody: string;
  heroSize: string;
  subtitleStyle: 'uppercase' | 'italic' | 'normal';
  letterSpacing: string;
}

export interface ThemeLayout {
  borderRadius: string;
  navStyle: 'top' | 'floating';
  heroStyle: 'centered' | 'minimal';
  cardStyle: 'elevated' | 'bordered' | 'flat';
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  preview: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

// ============================================
// CLASSIC THEME (Current burgundy theme)
// ============================================
export const classicTheme: Theme = {
  id: 'classic',
  name: 'Classique',
  description: 'Élégant et intemporel avec des touches de bordeaux',
  preview: '/images/themes/classic-preview.jpg',
  colors: {
    primary: '#ae1725',
    primaryHover: '#c92a38',
    accent: '#ae1725',
    background: '#F8F6F0',
    backgroundAlt: '#FFFFF0',
    text: '#2C2C2C',
    textLight: '#9B8B80',
    textMuted: '#C0C0C0',
    border: 'rgba(192, 192, 192, 0.3)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.9)',
  },
  typography: {
    fontDisplay: 'Playfair Display',
    fontBody: 'Inter',
    heroSize: '4rem',
    subtitleStyle: 'normal',
    letterSpacing: 'normal',
  },
  layout: {
    borderRadius: '1rem',
    navStyle: 'top',
    heroStyle: 'centered',
    cardStyle: 'elevated',
  },
};

// ============================================
// LUXE THEME (Gold & minimalist)
// ============================================
export const luxeTheme: Theme = {
  id: 'luxe',
  name: 'Luxe',
  description: 'Minimaliste et sophistiqué avec des accents dorés',
  preview: '/images/themes/luxe-preview.jpg',
  colors: {
    primary: '#2C2C2C',
    primaryHover: '#D4AF37',
    accent: '#D4AF37',
    background: '#F9F9F5',
    backgroundAlt: '#FFFFFF',
    text: '#2C2C2C',
    textLight: '#666666',
    textMuted: '#999999',
    border: 'rgba(0, 0, 0, 0.08)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.85)',
  },
  typography: {
    fontDisplay: 'Playfair Display',
    fontBody: 'Inter',
    heroSize: '2.8rem',
    subtitleStyle: 'uppercase',
    letterSpacing: '2px',
  },
  layout: {
    borderRadius: '24px',
    navStyle: 'floating',
    heroStyle: 'minimal',
    cardStyle: 'bordered',
  },
};

// ============================================
// THEME REGISTRY
// ============================================
export const themes: Record<ThemeId, Theme> = {
  classic: classicTheme,
  luxe: luxeTheme,
};

export const themeList: Theme[] = Object.values(themes);

export function getTheme(id: ThemeId): Theme {
  return themes[id] || classicTheme;
}

// ============================================
// CSS VARIABLE GENERATOR
// ============================================
export function generateThemeCSS(theme: Theme): string {
  return `
    --theme-primary: ${theme.colors.primary};
    --theme-primary-hover: ${theme.colors.primaryHover};
    --theme-accent: ${theme.colors.accent};
    --theme-background: ${theme.colors.background};
    --theme-background-alt: ${theme.colors.backgroundAlt};
    --theme-text: ${theme.colors.text};
    --theme-text-light: ${theme.colors.textLight};
    --theme-text-muted: ${theme.colors.textMuted};
    --theme-border: ${theme.colors.border};
    --theme-card: ${theme.colors.card};
    --theme-glass: ${theme.colors.glass};
    --theme-border-radius: ${theme.layout.borderRadius};
    --theme-font-display: '${theme.typography.fontDisplay}', serif;
    --theme-font-body: '${theme.typography.fontBody}', sans-serif;
    --theme-hero-size: ${theme.typography.heroSize};
    --theme-letter-spacing: ${theme.typography.letterSpacing};
  `;
}

// ============================================
// THEME CONTEXT HELPERS
// ============================================
export interface ThemeContext {
  theme: Theme;
  colors: ThemeColors;
  isLuxe: boolean;
  isClassic: boolean;
}

export function createThemeContext(themeId: ThemeId): ThemeContext {
  const theme = getTheme(themeId);
  return {
    theme,
    colors: theme.colors,
    isLuxe: themeId === 'luxe',
    isClassic: themeId === 'classic',
  };
}
