import type { APIRoute } from 'astro';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { supabase } from '../../../lib/supabase/client';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured',
        message: 'Supabase is not configured. Please set environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const slug = url.searchParams.get('slug');
  if (!slug) {
    return new Response(
      JSON.stringify({
        error: 'Missing slug',
        message: 'slug is required',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { data: wedding, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !wedding) {
      return new Response(
        JSON.stringify({
          error: 'Not found',
          message: 'Wedding not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ wedding }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Wedding lookup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
