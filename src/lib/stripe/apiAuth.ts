/**
 * API Authentication for Stripe Endpoints
 * Verifies that the authenticated user owns the requested profile
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

// Storage key constants (must match clientAuth.ts)
const CLIENT_TOKEN_HEADER = 'x-client-token';

export interface AuthResult {
  authorized: boolean;
  profileId?: string;
  error?: string;
}

/**
 * Verify that the request is authorized to access the given profile
 * Extracts the session token from headers and verifies ownership
 */
export async function verifyProfileOwnership(
  request: Request,
  requestedProfileId: string,
  adminClient: SupabaseClient<Database>
): Promise<AuthResult> {
  // Get token from header
  const token = request.headers.get(CLIENT_TOKEN_HEADER);

  if (!token) {
    return { authorized: false, error: 'Missing authentication token' };
  }

  // Verify token and get the authenticated user's profile ID
  const { data: session, error: sessionError } = await adminClient
    .from('auth_sessions')
    .select('user_id')
    .eq('token', token)
    .eq('user_type', 'client')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return { authorized: false, error: 'Invalid or expired session' };
  }

  // Verify the authenticated user owns the requested profile
  if (session.user_id !== requestedProfileId) {
    return { authorized: false, error: 'Unauthorized access to profile' };
  }

  return { authorized: true, profileId: session.user_id };
}

/**
 * Validate that a URL is same-origin with the site
 */
export function validateSameOrigin(url: string, siteUrl: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = new URL(siteUrl);
    return parsed.origin === allowed.origin;
  } catch {
    return false;
  }
}

/**
 * Create a JSON error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify({ error, ...(code && { code }) }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Create a JSON success response
 */
export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
