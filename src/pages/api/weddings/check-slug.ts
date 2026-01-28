import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';

export const prerender = false;

// Reserved slugs that cannot be used for weddings
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'demo',
  'demo_gallery',
  'demo_livre-or',
  'demo_rsvp',
  'demo_website',
  'connexion',
  'pricing',
  'tarification',
  'precios',
  'offline',
  'fr',
  'es',
  'account',
  'god',
  'test',
  'signup',
  'inscription',
  'registro',
  'guestbook',
  'gallery',
  'photos',
  'rsvp',
  'infos',
  'livre-or',
  'mentions-legales',
  'cgv',
  'politique-confidentialite',
]);

// Validate slug format: lowercase alphanumeric and hyphens, 3-50 chars
function isValidSlugFormat(slug: string): boolean {
  if (slug.length < 3 || slug.length > 50) {
    return false;
  }
  // Must start and end with alphanumeric, can contain hyphens in between
  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/;
  return slugPattern.test(slug);
}

// Generate slug suggestions based on base slug
function generateSuggestions(baseSlug: string): string[] {
  const suggestions: string[] = [];
  const year = new Date().getFullYear();

  // Add year suffix
  suggestions.push(`${baseSlug}-${year}`);

  // Add number suffixes
  for (let i = 2; i <= 4; i++) {
    suggestions.push(`${baseSlug}-${i}`);
  }

  return suggestions.filter(s => s.length <= 50);
}

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug')?.toLowerCase().trim();

  if (!slug) {
    return new Response(
      JSON.stringify({
        error: 'Missing slug parameter',
        available: false,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check format validity
  if (!isValidSlugFormat(slug)) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: 'invalid_format',
        message: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if slug is reserved
  if (RESERVED_SLUGS.has(slug)) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: 'reserved',
        message: 'This URL is reserved and cannot be used.',
        suggestions: generateSuggestions(slug),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // If Supabase is not configured, return available (demo mode)
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        available: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Check if slug exists in weddings table
    const { data: existing, error } = await supabase
      .from('weddings')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[API] Check slug error:', error);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          available: false,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'taken',
          message: 'This URL is already in use.',
          suggestions: generateSuggestions(slug),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        available: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Check slug error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        available: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
