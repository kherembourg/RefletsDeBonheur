import { useEffect, useState } from 'react';
import type { WeddingCustomization } from '../lib/customization';
import { generateCustomPaletteCSS } from '../lib/customization';
import { getTheme } from '../lib/themes';

const PREVIEW_STORAGE_KEY = 'wedding_preview_customization';

interface PreviewCustomizationProviderProps {
  weddingSlug: string;
  children?: React.ReactNode;
}

/**
 * PreviewCustomizationProvider
 *
 * This component enables live preview in the website editor.
 * It listens for customization updates via:
 * 1. postMessage from the parent editor window
 * 2. localStorage changes
 *
 * When customization changes, it injects CSS variables into the page.
 */
export function PreviewCustomizationProvider({
  weddingSlug,
  children,
}: PreviewCustomizationProviderProps) {
  const [customization, setCustomization] = useState<WeddingCustomization | null>(null);

  // Load initial customization from localStorage
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(PREVIEW_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          // Verify it's for the current wedding
          if (data.weddingSlug === weddingSlug) {
            setCustomization(data.customization);
          }
        }
      } catch (error) {
        console.warn('Failed to load preview customization from localStorage:', error);
      }
    };

    loadFromStorage();

    // Listen for storage changes (from other tabs/frames)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PREVIEW_STORAGE_KEY) {
        loadFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [weddingSlug]);

  // Listen for postMessage from editor
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin to prevent XSS via malicious postMessage
      if (event.origin !== window.location.origin) {
        // Silently ignore messages from other origins
        return;
      }

      if (event.data?.type === 'CUSTOMIZATION_UPDATE') {
        setCustomization(event.data.customization);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Apply customization via CSS variables
  useEffect(() => {
    if (!customization) return;

    const theme = getTheme(customization.themeId);
    const cssVars = generateCustomPaletteCSS(theme.colors, customization.customPalette);
    const mergedColors = {
      ...theme.colors,
      ...(customization.customPalette || {}),
    };

    // Generate comprehensive CSS that overrides Tailwind classes
    // This ensures custom colors are applied to all page elements
    const overrideCSS = `
      :root {
        ${cssVars}
      }

      /* Override body background */
      body {
        background-color: ${mergedColors.background} !important;
      }

      /* Override text colors */
      .text-deep-charcoal,
      .text-charcoal {
        color: ${mergedColors.text} !important;
      }

      .text-warm-taupe,
      .text-charcoal\\/70,
      .text-charcoal\\/60 {
        color: ${mergedColors.textLight} !important;
      }

      .text-silver-mist,
      .text-charcoal\\/40 {
        color: ${mergedColors.textMuted} !important;
      }

      /* Override background colors */
      .bg-pearl-white,
      .bg-cream {
        background-color: ${mergedColors.background} !important;
      }

      .bg-cream-dark,
      .bg-cream\\/50 {
        background-color: ${mergedColors.backgroundAlt} !important;
      }

      .bg-white,
      .dark\\:bg-deep-charcoal\\/50 {
        background-color: ${mergedColors.card} !important;
      }

      /* Override header/nav backgrounds */
      header.fixed {
        background-color: ${mergedColors.card}f2 !important;
        border-color: ${mergedColors.border} !important;
      }

      /* Override card backgrounds */
      .rounded-xl.shadow-xs,
      .rounded-xl.shadow-md {
        background-color: ${mergedColors.card} !important;
      }

      /* Override primary color (buttons, links, accents) */
      [style*="background-color: ${theme.colors.primary}"],
      [style*="background-color: #ae1725"] {
        background-color: ${mergedColors.primary} !important;
      }

      [style*="color: ${theme.colors.primary}"],
      [style*="color: #ae1725"] {
        color: ${mergedColors.primary} !important;
      }

      /* Override SVG icon colors in cards */
      .group svg[style*="color"] {
        color: ${mergedColors.primary} !important;
      }

      /* Override icon background colors */
      [style*="background-color: ${theme.colors.primary}15"],
      [style*="background-color: #ae172515"] {
        background-color: ${mergedColors.primary}15 !important;
      }

      /* Override borders */
      .border-charcoal\\/5,
      .border-charcoal\\/10 {
        border-color: ${mergedColors.border} !important;
      }

      /* Override footer */
      footer {
        background: linear-gradient(to bottom, ${mergedColors.backgroundAlt}, ${mergedColors.background}) !important;
      }

      /* Script font (names) - use primary color */
      .font-script {
        color: ${mergedColors.primary} !important;
      }

      /* Hero section adjustments */
      [class*="hero"],
      [class*="Hero"] {
        background-color: ${mergedColors.background} !important;
      }

      /* Ensure text remains readable on custom backgrounds */
      h1, h2, h3, h4, h5, h6 {
        color: ${mergedColors.text};
      }
    `;

    // Create or update style element
    let styleEl = document.getElementById('preview-customization-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'preview-customization-styles';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = overrideCSS;

    // Dispatch custom event for other components to listen
    window.dispatchEvent(
      new CustomEvent('customization-update', {
        detail: customization,
      })
    );

    return () => {
      // Cleanup on unmount
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [customization]);

  return <>{children}</>;
}

/**
 * Hook to get current customization in preview mode
 */
export function usePreviewCustomization(): WeddingCustomization | null {
  const [customization, setCustomization] = useState<WeddingCustomization | null>(null);

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<WeddingCustomization>) => {
      setCustomization(e.detail);
    };

    window.addEventListener('customization-update', handleUpdate as EventListener);
    return () => window.removeEventListener('customization-update', handleUpdate as EventListener);
  }, []);

  return customization;
}

/**
 * Get initial customization from localStorage (for SSR hydration)
 */
export function getPreviewCustomizationFromStorage(weddingSlug: string): WeddingCustomization | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.weddingSlug === weddingSlug) {
        return data.customization;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}
