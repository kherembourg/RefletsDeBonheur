import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import type { WeddingCustomization } from '../../../lib/customization';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';

/**
 * POST /api/customization/save
 * Saves wedding website customization (theme, colors, content, images)
 * Requires authorization: user must be the wedding owner
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

    // Authorization check - verify user is the wedding owner
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current wedding config and verify ownership
    const { data: wedding, error: fetchError } = await supabase
      .from('weddings')
      .select('config, owner_id')
      .eq('id', weddingId)
      .single();

    if (fetchError || !wedding) {
      return new Response(
        JSON.stringify({ error: 'Wedding not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is the owner
    if (wedding.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to modify this wedding' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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
