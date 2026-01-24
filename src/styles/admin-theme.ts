/**
 * Admin Dashboard Theme System
 *
 * Centralized theme configuration for all admin components.
 * Provides consistent colors, spacing, typography, and component styles.
 */

// Admin color palette - inspired by modern SaaS dashboards
export const adminColors = {
  // Primary actions
  primary: {
    50: '#fef2f3',
    100: '#fde6e8',
    200: '#fbd0d5',
    300: '#f7aab3',
    400: '#f27a8a',
    500: '#e74c63',
    600: '#d32f4c',
    700: '#ae1725', // Main burgundy
    800: '#941a2a',
    900: '#7f1b29',
    950: '#450a11',
  },

  // Neutral grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Success states
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Warning states
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // Error states
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Info states
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Background colors
  background: {
    page: '#f5f0e8',      // Cream background
    card: '#ffffff',
    cardHover: '#fafafa',
    sidebar: '#1a1a1a',
    sidebarHover: '#262626',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: '#333333',    // Charcoal
    secondary: '#555555',  // Charcoal light
    muted: '#737373',
    inverse: '#ffffff',
    accent: '#ae1725',     // Burgundy
  },

  // Border colors
  border: {
    light: 'rgba(0, 0, 0, 0.05)',
    default: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
    accent: 'rgba(174, 23, 37, 0.2)',
  },
} as const;

// Spacing scale
export const adminSpacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

// Border radius
export const adminRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Shadow system
export const adminShadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
} as const;

// Typography
export const adminTypography = {
  fontFamily: {
    serif: 'Cormorant Garamond, Playfair Display, Georgia, serif',
    sans: 'Montserrat, Inter, system-ui, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// Transitions
export const adminTransitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Component-specific styles (as Tailwind class strings)
export const adminStyles = {
  // Cards
  card: {
    base: 'bg-white rounded-lg border border-charcoal/5 shadow-xs',
    hover: 'hover:shadow-md hover:border-charcoal/10 transition-all duration-200',
    padding: 'p-6',
    header: 'pb-4 mb-4 border-b border-charcoal/5',
  },

  // Buttons
  button: {
    base: 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    primary: 'bg-burgundy-old text-white hover:bg-[#c92a38] focus:ring-burgundy-old/50',
    secondary: 'bg-charcoal text-white hover:bg-charcoal/90 focus:ring-charcoal/50',
    outline: 'border-2 border-charcoal/20 text-charcoal hover:border-charcoal/40 hover:bg-charcoal/5 focus:ring-charcoal/30',
    ghost: 'text-charcoal hover:bg-charcoal/5 focus:ring-charcoal/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50',
    success: 'bg-sage text-white hover:bg-sage-light focus:ring-sage/50',
    sizes: {
      xs: 'px-2.5 py-1.5 text-xs rounded',
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-2.5 text-sm rounded-md',
      lg: 'px-5 py-3 text-base rounded-lg',
      xl: 'px-6 py-3.5 text-base rounded-lg',
    },
  },

  // Form inputs
  input: {
    base: 'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2',
    default: 'border-charcoal/10 bg-white text-charcoal placeholder-charcoal/40 focus:border-burgundy-old focus:ring-burgundy-old/20',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
    disabled: 'bg-charcoal/5 cursor-not-allowed opacity-60',
    sizes: {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-4 py-3 text-base',
    },
  },

  // Labels
  label: {
    base: 'block text-sm font-medium text-charcoal mb-1.5',
    required: "after:content-['*'] after:ml-0.5 after:text-red-500",
    optional: 'text-charcoal/60',
  },

  // Section headers
  section: {
    header: 'flex items-center gap-3 mb-6',
    icon: 'w-10 h-10 rounded-lg bg-burgundy-old/10 flex items-center justify-center',
    iconInner: 'text-burgundy-old',
    title: 'font-serif text-xl text-charcoal font-light',
    description: 'text-charcoal/50 text-sm font-light',
  },

  // Stats cards
  stat: {
    card: 'bg-white p-6 rounded-lg border border-charcoal/5 shadow-xs',
    icon: 'w-12 h-12 rounded-lg bg-burgundy-old/10 flex items-center justify-center mb-3',
    value: 'font-serif text-3xl text-charcoal font-light',
    label: 'text-xs text-charcoal/50 uppercase tracking-wide mt-1',
  },

  // Sidebar navigation
  sidebar: {
    container: 'w-64 bg-[#1a1a1a] text-white min-h-screen flex flex-col',
    header: 'p-6 border-b border-white/10',
    nav: 'flex-1 p-4 space-y-1',
    item: {
      base: 'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
      default: 'text-white/70 hover:text-white hover:bg-white/10',
      active: 'text-white bg-burgundy-old',
    },
    section: 'pt-4 mt-4 border-t border-white/10',
    sectionLabel: 'px-4 text-xs uppercase tracking-wider text-white/40 mb-2',
    footer: 'p-4 border-t border-white/10',
  },

  // Tables
  table: {
    container: 'overflow-x-auto rounded-lg border border-charcoal/10',
    table: 'w-full',
    header: 'bg-charcoal/5',
    headerCell: 'px-4 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wide',
    row: 'border-t border-charcoal/5 hover:bg-charcoal/[0.02] transition-colors',
    cell: 'px-4 py-4 text-sm text-charcoal',
  },

  // Badges
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-charcoal/10 text-charcoal',
      primary: 'bg-burgundy-old/10 text-burgundy-old',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700',
    },
  },

  // Toggle/Switch
  toggle: {
    container: 'relative inline-flex items-center cursor-pointer',
    track: {
      base: 'w-11 h-6 rounded-full transition-colors duration-200',
      off: 'bg-charcoal/20',
      on: 'bg-burgundy-old',
    },
    thumb: {
      base: 'absolute w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
      off: 'translate-x-0.5',
      on: 'translate-x-[22px]',
    },
  },

  // Modal
  modal: {
    overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
    container: 'bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden',
    header: 'px-6 py-4 border-b border-charcoal/10 flex items-center justify-between',
    title: 'text-lg font-semibold text-charcoal',
    body: 'p-6 overflow-y-auto',
    footer: 'px-6 py-4 border-t border-charcoal/10 flex items-center justify-end gap-3',
  },

  // Pagination
  pagination: {
    container: 'flex items-center justify-between',
    info: 'text-sm text-charcoal/60',
    buttons: 'flex items-center gap-1',
    button: {
      base: 'px-3 py-2 text-sm rounded-md transition-all duration-200',
      default: 'text-charcoal hover:bg-charcoal/5',
      active: 'bg-burgundy-old text-white',
      disabled: 'text-charcoal/30 cursor-not-allowed',
    },
  },

  // Empty state
  empty: {
    container: 'text-center py-12',
    icon: 'w-16 h-16 mx-auto mb-4 text-charcoal/20',
    title: 'text-lg font-medium text-charcoal mb-2',
    description: 'text-sm text-charcoal/50 mb-6',
  },

  // Divider with decoration
  divider: {
    decorative: 'flex items-center justify-center gap-4 my-8',
    line: 'flex-1 h-px bg-gradient-to-r from-transparent via-burgundy-old/20 to-transparent',
    symbol: 'text-burgundy-old/30 text-lg',
  },
} as const;

// Helper to combine multiple class strings
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Export types for TypeScript
export type AdminButtonVariant = keyof typeof adminStyles.button;
export type AdminButtonSize = keyof typeof adminStyles.button.sizes;
export type AdminBadgeVariant = keyof typeof adminStyles.badge.variants;
export type AdminInputSize = keyof typeof adminStyles.input.sizes;
