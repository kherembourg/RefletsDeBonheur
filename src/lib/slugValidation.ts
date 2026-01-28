/**
 * Shared slug validation utilities
 * Used by /api/signup and /api/weddings/check-slug
 */

/**
 * Reserved slugs that cannot be used for wedding URLs
 * These are system routes, language prefixes, and reserved names
 */
export const RESERVED_SLUGS = new Set([
  // System routes
  'admin',
  'api',
  'demo',
  'demo_gallery',
  'demo_livre-or',
  'connexion',
  'pricing',
  'offline',
  'account',
  'god',
  'test',
  'signup',
  'inscription',
  'registro',
  // Language prefixes
  'fr',
  'es',
  'en',
  // Common reserved names
  'www',
  'app',
  'static',
  'assets',
  'images',
  'css',
  'js',
  '_next',
  '.well-known',
]);

/**
 * Validates slug format
 * Rules:
 * - 3-50 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Must start and end with alphanumeric
 */
export function isValidSlugFormat(slug: string): boolean {
  // Must be 3-50 characters
  if (slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Pattern: starts/ends with alphanumeric, middle can have hyphens
  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

  // Special case: 3 char slugs can be just alphanumeric
  if (slug.length === 3) {
    return /^[a-z0-9]{3}$/.test(slug);
  }

  return pattern.test(slug);
}

/**
 * Normalizes a slug by converting to lowercase and trimming
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}

/**
 * Generates slug suggestions based on a base slug that's taken
 */
export function generateSlugSuggestions(baseSlug: string): string[] {
  const suggestions: string[] = [];
  const currentYear = new Date().getFullYear();

  // Add year
  const withYear = `${baseSlug}-${currentYear}`;
  if (isValidSlugFormat(withYear)) {
    suggestions.push(withYear);
  }

  // Add numbers
  for (let i = 2; i <= 4; i++) {
    const withNumber = `${baseSlug}-${i}`;
    if (isValidSlugFormat(withNumber)) {
      suggestions.push(withNumber);
    }
  }

  return suggestions;
}
