// Website Customization System
// Stores custom palettes, content, and images for wedding websites

import type { ThemeId, ThemeColors } from './themes';

// ============================================
// CUSTOM PALETTE
// ============================================

export interface CustomPalette {
  // Override any theme color
  primary?: string;
  primaryHover?: string;
  accent?: string;
  background?: string;
  backgroundAlt?: string;
  text?: string;
  textLight?: string;
  textMuted?: string;
  border?: string;
  card?: string;
  glass?: string;
}

// ============================================
// CUSTOM CONTENT
// ============================================

export interface CustomContent {
  // Hero section
  heroTitle?: string;
  heroSubtitle?: string;
  heroDate?: string;

  // Welcome section
  welcomeTitle?: string;
  welcomeMessage?: string;

  // About us section
  aboutUsTitle?: string;
  aboutUsText?: string;

  // Gallery section
  galleryTitle?: string;
  galleryDescription?: string;
  galleryCallToAction?: string;

  // Guestbook section
  guestbookTitle?: string;
  guestbookDescription?: string;
  guestbookCallToAction?: string;

  // RSVP section
  rsvpTitle?: string;
  rsvpDescription?: string;

  // Footer
  footerText?: string;
}

// ============================================
// CUSTOM IMAGES
// ============================================

export interface CustomImages {
  // Hero section
  heroImage?: string;
  heroBackgroundImage?: string;

  // About section
  couplePhoto?: string;

  // Gallery
  galleryPlaceholder?: string;

  // General
  logoImage?: string;
  faviconUrl?: string;
}

// ============================================
// WEDDING CUSTOMIZATION
// ============================================

export interface WeddingCustomization {
  // Base theme selection
  themeId: ThemeId;

  // Custom overrides
  customPalette?: CustomPalette;
  customContent?: CustomContent;
  customImages?: CustomImages;

  // Last updated timestamp
  lastUpdated?: string;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_CUSTOMIZATION: WeddingCustomization = {
  themeId: 'classic',
  customPalette: undefined,
  customContent: undefined,
  customImages: undefined,
};

// ============================================
// MERGE HELPERS
// ============================================

/**
 * Merge theme colors with custom palette
 */
export function mergeCustomPalette(
  themeColors: ThemeColors,
  customPalette?: CustomPalette
): ThemeColors {
  if (!customPalette) return themeColors;

  return {
    ...themeColors,
    ...Object.fromEntries(
      Object.entries(customPalette).filter(([_, value]) => value !== undefined)
    ),
  } as ThemeColors;
}

/**
 * Get merged color palette CSS variables
 */
export function generateCustomPaletteCSS(
  themeColors: ThemeColors,
  customPalette?: CustomPalette
): string {
  const merged = mergeCustomPalette(themeColors, customPalette);

  return `
    --theme-primary: ${merged.primary};
    --theme-primary-hover: ${merged.primaryHover};
    --theme-accent: ${merged.accent};
    --theme-background: ${merged.background};
    --theme-background-alt: ${merged.backgroundAlt};
    --theme-text: ${merged.text};
    --theme-text-light: ${merged.textLight};
    --theme-text-muted: ${merged.textMuted};
    --theme-border: ${merged.border};
    --theme-card: ${merged.card};
    --theme-glass: ${merged.glass};
  `;
}

/**
 * Get content value with fallback
 */
export function getContentValue(
  customContent: CustomContent | undefined,
  key: keyof CustomContent,
  defaultValue: string
): string {
  return customContent?.[key] || defaultValue;
}

/**
 * Get image URL with fallback
 */
export function getImageValue(
  customImages: CustomImages | undefined,
  key: keyof CustomImages,
  defaultValue: string
): string {
  return customImages?.[key] || defaultValue;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate custom palette
 */
export function validateCustomPalette(palette: CustomPalette): string[] {
  const errors: string[] = [];

  Object.entries(palette).forEach(([key, value]) => {
    if (value && !isValidHexColor(value) && !value.startsWith('rgba')) {
      errors.push(`Invalid color format for ${key}: ${value}`);
    }
  });

  return errors;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  } catch {
    return false;
  }
}
