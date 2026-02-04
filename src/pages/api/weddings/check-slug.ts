import type { APIRoute } from 'astro';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { RESERVED_SLUGS, isValidSlugFormat, generateSlugSuggestions } from '../../../lib/slugValidation';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  // Rate limit check - 30 requests per IP per minute
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.slugCheck);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

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
        suggestions: generateSlugSuggestions(slug),
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
          suggestions: generateSlugSuggestions(slug),
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
