import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import type { WeddingCustomization } from '../../../lib/customization';

/**
 * POST /api/customization/save
 * Saves wedding website customization (theme, colors, content, images)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { weddingId, customization } = body as {
      weddingId: string;
      customization: WeddingCustomization;
    };

    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: 'Wedding ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!customization) {
      return new Response(
        JSON.stringify({ error: 'Customization data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current wedding config
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

    // Merge customization into config
    const updatedConfig = {
      ...wedding.config,
      customization: customization,
    };

    // Update wedding config
    const { error: updateError } = await supabase
      .from('weddings')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    if (updateError) {
      console.error('Failed to update wedding customization:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save customization' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Customization saved successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Customization save error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
