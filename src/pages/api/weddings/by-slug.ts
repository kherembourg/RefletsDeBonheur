import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

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

    return apiResponse.success({ wedding });
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
