/**
 * Helper functions to apply wedding customizations to pages
 */

import { getTheme, type Theme } from './themes';
import type { WeddingCustomization, CustomPalette, CustomContent, CustomImages } from './customization';
import { mergeCustomPalette, getContentValue, getImageValue } from './customization';

/**
 * Extract customization from wedding config
 */
export function extractCustomization(config: any): WeddingCustomization | null {
  return config?.customization || null;
}

/**
 * Get effective theme with custom palette applied
 */
export function getEffectiveTheme(
  baseThemeId: string,
  customPalette?: CustomPalette
): Theme {
  const theme = getTheme(baseThemeId as any);

  if (customPalette) {
    return {
      ...theme,
      colors: mergeCustomPalette(theme.colors, customPalette),
    };
  }

  return theme;
}

/**
 * Generate CSS for customization
 */
export function generateCustomizationCSS(
  theme: Theme,
  customPalette?: CustomPalette
): string {
  const colors = customPalette ? mergeCustomPalette(theme.colors, customPalette) : theme.colors;

  return `
    :root {
      --theme-primary: ${colors.primary};
      --theme-primary-hover: ${colors.primaryHover};
      --theme-accent: ${colors.accent};
      --theme-background: ${colors.background};
      --theme-background-alt: ${colors.backgroundAlt};
      --theme-text: ${colors.text};
      --theme-text-light: ${colors.textLight};
      --theme-text-muted: ${colors.textMuted};
      --theme-border: ${colors.border};
      --theme-card: ${colors.card};
      --theme-glass: ${colors.glass};
      --theme-border-radius: ${theme.layout.borderRadius};
      --theme-font-display: '${theme.typography.fontDisplay}', serif;
      --theme-font-body: '${theme.typography.fontBody}', sans-serif;
    }
  `;
}

/**
 * Get effective content value with custom override
 */
export function getEffectiveContent(
  customContent: CustomContent | undefined,
  key: keyof CustomContent,
  defaultValue: string
): string {
  return getContentValue(customContent, key, defaultValue);
}

/**
 * Get effective image URL with custom override
 */
export function getEffectiveImage(
  customImages: CustomImages | undefined,
  key: keyof CustomImages,
  defaultValue: string
): string {
  return getImageValue(customImages, key, defaultValue);
}

/**
 * Create customization props for React components
 */
export interface CustomizationProps {
  customContent?: CustomContent;
  customImages?: CustomImages;
  effectiveTheme: Theme;
}

export function createCustomizationProps(
  customization: WeddingCustomization | null,
  baseThemeId: string
): CustomizationProps {
  const effectiveTheme = customization
    ? getEffectiveTheme(baseThemeId, customization.customPalette)
    : getTheme(baseThemeId as any);

  return {
    customContent: customization?.customContent,
    customImages: customization?.customImages,
    effectiveTheme,
  };
}
