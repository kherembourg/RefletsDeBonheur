import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/** Cookie name used to pass the auth session token to the server */
export const AUTH_SESSION_COOKIE = 'reflets_session_token';

export function isSupabaseServiceRoleConfigured(): boolean {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

/**
 * Verify server-side session from cookie.
 * Reads the session token from the `reflets_session_token` cookie,
 * then validates it against the `auth_sessions` table using the admin client.
 *
 * Returns the authenticated user_id if valid, or null if not.
 */
export async function verifyServerSession(
  cookies: { get(name: string): { value: string } | undefined }
): Promise<{ userId: string; userType: string } | null> {
  if (!isSupabaseServiceRoleConfigured()) {
    return null;
  }

  const sessionCookie = cookies.get(AUTH_SESSION_COOKIE);
  if (!sessionCookie?.value) {
    return null;
  }

  const token = sessionCookie.value;

  try {
    const admin = getSupabaseAdminClient();

    const { data: session, error } = await admin
      .from('auth_sessions')
      .select('user_id, user_type')
      .eq('token', token)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return { userId: session.user_id, userType: session.user_type };
  } catch (error) {
    console.error('[Server Auth] Session verification error:', error);
    return null;
  }
}

/**
 * Verify that a user owns a specific wedding.
 * Uses the admin client to check the wedding's owner_id.
 */
export async function verifyWeddingOwnership(
  userId: string,
  weddingId: string
): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) {
    return false;
  }

  try {
    const admin = getSupabaseAdminClient();

    const { data: wedding, error } = await admin
      .from('weddings')
      .select('owner_id')
      .eq('id', weddingId)
      .single();

    if (error || !wedding) {
      return false;
    }

    return wedding.owner_id === userId;
  } catch (error) {
    console.error('[Server Auth] Ownership verification error:', error);
    return false;
  }
}
