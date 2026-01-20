import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import type { WeddingCustomization } from '../../../lib/customization';
import { DEFAULT_CUSTOMIZATION } from '../../../lib/customization';

/**
 * GET /api/customization/get?weddingId=xxx
 * Fetches wedding website customization
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const weddingId = url.searchParams.get('weddingId');

    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: 'Wedding ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get wedding config
    const { data: wedding, error: fetchError } = await supabase
      .from('weddings')
      .select('config')
      .eq('id', weddingId)
      .single();

    if (fetchError || !wedding) {
      return new Response(
        JSON.stringify({ error: 'Wedding not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract customization from config
    const customization: WeddingCustomization =
      wedding.config?.customization || DEFAULT_CUSTOMIZATION;

    return new Response(JSON.stringify({ customization }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Customization fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
