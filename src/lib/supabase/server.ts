import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/** Cookie name used to pass the auth session token to the server */
export const AUTH_SESSION_COOKIE = 'reflets_session_token';
/** Cookie name used to pass the guest session token to the server */
export const GUEST_SESSION_COOKIE = 'reflets_guest_session_token';

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

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const name = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    cookies.set(name, decodeURIComponent(value));
  }

  return cookies;
}

export function getCookieValueFromRequest(request: Request, name: string): string | null {
  return parseCookieHeader(request.headers.get('cookie')).get(name) ?? null;
}

function shouldUseSecureCookies(request: Request): boolean {
  try {
    const url = new URL(request.url);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createSessionCookie(
  request: Request,
  name: string,
  token: string,
  maxAgeSeconds: number
): string {
  const secure = shouldUseSecureCookies(request) ? '; Secure' : '';
  return `${name}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request: Request, name: string): string {
  const secure = shouldUseSecureCookies(request) ? '; Secure' : '';
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

export async function verifyAppSessionToken(
  token: string,
  userType?: string
): Promise<{ userId: string; userType: string; sessionId?: string } | null> {
  if (!isSupabaseServiceRoleConfigured() || !token) {
    return null;
  }

  try {
    const admin = getSupabaseAdminClient();
    let query = admin
      .from('auth_sessions')
      .select('id, user_id, user_type')
      .eq('token', token)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (userType) {
      query = query.eq('user_type', userType);
    }

    const { data: session, error } = await query.single();

    if (error || !session) {
      return null;
    }

    return {
      userId: session.user_id,
      userType: session.user_type,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('[Server Auth] App session verification error:', error);
    return null;
  }
}

export async function verifyGuestSessionToken(
  token: string
): Promise<{ id: string; weddingId: string } | null> {
  if (!isSupabaseServiceRoleConfigured() || !token) {
    return null;
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: session, error } = await admin
      .from('guest_sessions')
      .select('id, wedding_id')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return {
      id: session.id,
      weddingId: session.wedding_id,
    };
  } catch (error) {
    console.error('[Server Auth] Guest session verification error:', error);
    return null;
  }
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
    const session = await verifyAppSessionToken(token);

    if (!session) {
      return null;
    }

    return { userId: session.userId, userType: session.userType };
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
