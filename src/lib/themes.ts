// Wedding Website Theme System

export type ThemeId = 'classic' | 'luxe' | 'jardin' | 'cobalt' | 'editorial' | 'french';

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
// JARDIN MODERNE THEME (Modern Garden)
// ============================================
export const jardinTheme: Theme = {
  id: 'jardin',
  name: 'Jardin Moderne',
  description: 'Frais et botanique avec des tons naturels apaisants',
  preview: '/images/themes/jardin-preview.jpg',
  colors: {
    primary: '#5A7D5F',      // Sage green
    primaryHover: '#4A6D4F',  // Darker sage
    accent: '#E8B4A8',        // Blush pink
    background: '#F7F9F5',    // Very light green-tinted cream
    backgroundAlt: '#FFFFFF',
    text: '#2F3E2C',          // Deep forest green
    textLight: '#7A9179',     // Muted sage
    textMuted: '#B5C4B3',     // Very light sage
    border: 'rgba(90, 125, 95, 0.15)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.92)',
  },
  typography: {
    fontDisplay: 'Cormorant Garamond',
    fontBody: 'Montserrat',
    heroSize: '3.5rem',
    subtitleStyle: 'italic',
    letterSpacing: 'normal',
  },
  layout: {
    borderRadius: '16px',
    navStyle: 'top',
    heroStyle: 'centered',
    cardStyle: 'flat',
  },
};

// ============================================
// COBALT THEME (Modern Bold)
// ============================================
export const cobaltTheme: Theme = {
  id: 'cobalt',
  name: 'Cobalt',
  description: 'Moderne et audacieux avec un bleu électrique captivant',
  preview: '/images/themes/cobalt-preview.jpg',
  colors: {
    primary: '#0047AB',       // Cobalt blue
    primaryHover: '#003A8C',  // Darker cobalt
    accent: '#FFA500',        // Orange accent for contrast
    background: '#FAFBFC',    // Very light blue-gray
    backgroundAlt: '#FFFFFF',
    text: '#1A1A1A',
    textLight: '#4A5568',
    textMuted: '#A0AEC0',
    border: 'rgba(0, 71, 171, 0.12)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.88)',
  },
  typography: {
    fontDisplay: 'Montserrat',
    fontBody: 'Inter',
    heroSize: '3.8rem',
    subtitleStyle: 'uppercase',
    letterSpacing: '1px',
  },
  layout: {
    borderRadius: '8px',
    navStyle: 'top',
    heroStyle: 'minimal',
    cardStyle: 'bordered',
  },
};

// ============================================
// EDITORIAL THEME (Magazine Style)
// ============================================
export const editorialTheme: Theme = {
  id: 'editorial',
  name: 'Éditorial',
  description: 'Style magazine avec typographie audacieuse et contrastes',
  preview: '/images/themes/editorial-preview.jpg',
  colors: {
    primary: '#000000',
    primaryHover: '#333333',
    accent: '#FF4757',        // Bold red accent
    background: '#FFFFFF',
    backgroundAlt: '#F8F8F8',
    text: '#000000',
    textLight: '#4A4A4A',
    textMuted: '#9E9E9E',
    border: 'rgba(0, 0, 0, 0.15)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.95)',
  },
  typography: {
    fontDisplay: 'Playfair Display',
    fontBody: 'Inter',
    heroSize: '5rem',
    subtitleStyle: 'normal',
    letterSpacing: '-1px',
  },
  layout: {
    borderRadius: '4px',
    navStyle: 'top',
    heroStyle: 'minimal',
    cardStyle: 'flat',
  },
};

// ============================================
// FRENCH MINIMALIST THEME (Herembourg-inspired)
// ============================================
export const frenchTheme: Theme = {
  id: 'french',
  name: 'French Minimalist',
  description: 'Ultra-épuré avec une élégance parisienne intemporelle',
  preview: '/images/themes/french-preview.jpg',
  colors: {
    primary: '#1A1A1A',
    primaryHover: '#000000',
    accent: '#696969',        // Charcoal gray
    background: '#FFFFFF',
    backgroundAlt: '#FAFAFA',
    text: '#1A1A1A',
    textLight: '#4D4D4D',
    textMuted: '#999999',
    border: 'rgba(0, 0, 0, 0.06)',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.98)',
  },
  typography: {
    fontDisplay: 'Cormorant Garamond',
    fontBody: 'Inter',
    heroSize: '2.5rem',
    subtitleStyle: 'normal',
    letterSpacing: '0.5px',
  },
  layout: {
    borderRadius: '0px',
    navStyle: 'top',
    heroStyle: 'minimal',
    cardStyle: 'flat',
  },
};

// ============================================
// THEME REGISTRY
// ============================================
export const themes: Record<ThemeId, Theme> = {
  classic: classicTheme,
  luxe: luxeTheme,
  jardin: jardinTheme,
  cobalt: cobaltTheme,
  editorial: editorialTheme,
  french: frenchTheme,
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
