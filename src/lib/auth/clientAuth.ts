/**
 * Client Authentication System
 * OAuth-like token flow for wedding clients
 */

import { supabase } from '../supabase/client';
import type { Client } from './godAuth';
import type { Profile, Wedding } from '../supabase/types';

// Storage keys
const CLIENT_TOKEN_KEY = 'reflets_client_token';
const CLIENT_SESSION_KEY = 'reflets_client_session';
const GUEST_TOKEN_KEY = 'reflets_guest_token';
const GUEST_SESSION_KEY = 'reflets_guest_session';

// Token expiration times
const CLIENT_SESSION_HOURS = 24 * 7; // 7 days
const GUEST_SESSION_HOURS = 24; // 1 day
const REFRESH_TOKEN_DAYS = 30;

/**
 * Generate a secure random token
 */
function generateToken(length: number = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export interface ClientSession {
  client_id: string;
  wedding_name: string;
  couple_names: string;
  wedding_slug: string;
  is_admin: boolean;
}

function profileToClient(profile: Profile, wedding: Wedding): Client {
  const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`.trim();
  const weddingName = (wedding.name || `Mariage de ${coupleNames}`.trim()).trim();

  return {
    id: profile.id,
    wedding_name: weddingName,
    couple_names: coupleNames,
    wedding_date: wedding.wedding_date,
    wedding_slug: wedding.slug,
    username: profile.email,
    email: profile.email,
    guest_code: wedding.pin_code || '',
    admin_code: wedding.magic_token,
    allow_uploads: wedding.config.features.gallery,
    allow_guestbook: wedding.config.features.guestbook,
    theme: wedding.config.theme.name,
    custom_domain: null,
    status: profile.subscription_status === 'active' || profile.subscription_status === 'trial' ? profile.subscription_status : 'expired',
    subscription_started_at: profile.created_at,
    subscription_expires_at: profile.subscription_end_date,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_login_at: null,
    photo_count: 0,
    video_count: 0,
    message_count: 0,
    storage_used_mb: 0,
  };
}

export interface GuestSession {
  client_id: string;
  wedding_slug: string;
  access_type: 'guest' | 'admin';
  guest_name?: string;
}

/**
 * Client Login (username/password)
 */
export async function clientLogin(username: string, password: string): Promise<{
  success: boolean;
  error?: string;
  client?: Client;
  token?: string;
  refreshToken?: string;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (authError || !authData.user) {
      await logAuditEvent('client_login_failed', 'client', null, { username });
      return { success: false, error: 'Invalid username or password' };
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trial') {
      return { success: false, error: 'Account is suspended or expired' };
    }

    if (profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date()) {
      await supabase
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', userId);
      return { success: false, error: 'Subscription has expired' };
    }

    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('*')
      .eq('owner_id', userId)
      .single();

    if (weddingError || !wedding) {
      return { success: false, error: 'Wedding not found' };
    }

    const client = profileToClient(profile, wedding);

    // Generate tokens
    const token = generateToken();
    const refreshToken = generateToken();

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + CLIENT_SESSION_HOURS);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

    // Create session
    const { error: sessionError } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: userId,
        user_type: 'client',
        token,
        refresh_token: refreshToken,
        expires_at: tokenExpiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return { success: false, error: 'Failed to create session' };
    }

    await logAuditEvent('client_login_success', 'client', userId, { username });

    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_TOKEN_KEY, token);
      localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify({
        client_id: userId,
        wedding_name: client.wedding_name,
        couple_names: client.couple_names,
        wedding_slug: client.wedding_slug,
        is_admin: true,
      } as ClientSession));
    }

    return {
      success: true,
      client,
      token,
      refreshToken,
    };
  } catch (error) {
    console.error('Client login error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Guest Login (access code)
 */
export async function guestLogin(code: string, guestName?: string): Promise<{
  success: boolean;
  error?: string;
  client?: Client;
  accessType?: 'guest' | 'admin';
  token?: string;
}> {
  try {
    const upperCode = code.toUpperCase().trim();

    const { data: weddings, error: fetchError } = await supabase
      .from('weddings')
      .select('*')
      .or(`pin_code.eq.${upperCode},magic_token.eq.${upperCode}`);

    if (fetchError || !weddings || weddings.length === 0) {
      return { success: false, error: 'Invalid access code' };
    }

    const wedding = weddings[0];
    const isAdminCode = wedding.magic_token === upperCode;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trial') {
      return { success: false, error: 'This wedding space is not available' };
    }

    const client = profileToClient(profile, wedding);

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + GUEST_SESSION_HOURS);

    const guestIdentifier = typeof window !== 'undefined' ? (localStorage.getItem('reflets_guest_id') || crypto.randomUUID()) : generateToken(12);

    if (typeof window !== 'undefined' && !localStorage.getItem('reflets_guest_id')) {
      localStorage.setItem('reflets_guest_id', guestIdentifier);
    }

    // Create guest session
    const { error: sessionError } = await supabase
      .from('guest_sessions')
      .insert({
        wedding_id: wedding.id,
        session_token: token,
        guest_identifier: guestIdentifier,
        guest_name: guestName || null,
        auth_method: isAdminCode ? 'magic_token' : 'pin',
        expires_at: expiresAt.toISOString(),
        last_active_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create guest session:', sessionError);
      return { success: false, error: 'Failed to create session' };
    }

    await logAuditEvent('guest_login', 'guest', null, {
      wedding_id: wedding.id,
      access_type: isAdminCode ? 'admin' : 'guest',
      guest_name: guestName,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_TOKEN_KEY, token);
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
        client_id: wedding.owner_id,
        wedding_slug: wedding.slug,
        access_type: isAdminCode ? 'admin' : 'guest',
        guest_name: guestName,
      } as GuestSession));
    }

    return {
      success: true,
      client,
      accessType: isAdminCode ? 'admin' : 'guest',
      token,
    };
  } catch (error) {
    console.error('Guest login error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Verify Client Session
 */
export async function verifyClientSession(): Promise<{
  valid: boolean;
  session?: ClientSession;
  client?: Client;
}> {
  try {
    if (typeof window === 'undefined') {
      return { valid: false };
    }

    const token = localStorage.getItem(CLIENT_TOKEN_KEY);
    if (!token) {
      return { valid: false };
    }

    // Verify token
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('token', token)
      .eq('user_type', 'client')
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      localStorage.removeItem(CLIENT_TOKEN_KEY);
      localStorage.removeItem(CLIENT_SESSION_KEY);
      return { valid: false };
    }

    // Fetch the client separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user_id)
      .single();

    if (profileError || !profile) {
      localStorage.removeItem(CLIENT_TOKEN_KEY);
      localStorage.removeItem(CLIENT_SESSION_KEY);
      return { valid: false };
    }

    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('*')
      .eq('owner_id', session.user_id)
      .single();

    if (weddingError || !wedding) {
      localStorage.removeItem(CLIENT_TOKEN_KEY);
      localStorage.removeItem(CLIENT_SESSION_KEY);
      return { valid: false };
    }

    const client = profileToClient(profile, wedding);

    // Update last used
    await supabase
      .from('auth_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.id);

    const storedSession = localStorage.getItem(CLIENT_SESSION_KEY);
    const clientSession = storedSession ? JSON.parse(storedSession) as ClientSession : null;

    return {
      valid: true,
      session: clientSession || undefined,
      client,
    };
  } catch (error) {
    console.error('Client session verification error:', error);
    return { valid: false };
  }
}

/**
 * Verify Guest Session
 */
export async function verifyGuestSession(): Promise<{
  valid: boolean;
  session?: GuestSession;
  client?: Client;
}> {
  try {
    if (typeof window === 'undefined') {
      return { valid: false };
    }

    const token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      return { valid: false };
    }

    const { data: session, error } = await supabase
      .from('guest_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      localStorage.removeItem(GUEST_TOKEN_KEY);
      localStorage.removeItem(GUEST_SESSION_KEY);
      return { valid: false };
    }

    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', session.wedding_id)
      .single();

    if (weddingError || !wedding) {
      localStorage.removeItem(GUEST_TOKEN_KEY);
      localStorage.removeItem(GUEST_SESSION_KEY);
      return { valid: false };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile) {
      localStorage.removeItem(GUEST_TOKEN_KEY);
      localStorage.removeItem(GUEST_SESSION_KEY);
      return { valid: false };
    }

    const client = profileToClient(profile, wedding);

    await supabase
      .from('guest_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.id);

    const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
    const guestSession = storedSession ? JSON.parse(storedSession) as GuestSession : null;

    return {
      valid: true,
      session: guestSession || undefined,
      client,
    };
  } catch (error) {
    console.error('Guest session verification error:', error);
    return { valid: false };
  }
}

/**
 * Refresh Client Token
 */
export async function refreshClientToken(refreshToken: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    // Find session by refresh token
    const { data: session, error: fetchError } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('user_type', 'client')
      .is('revoked_at', null)
      .gt('refresh_expires_at', new Date().toISOString())
      .single();

    if (fetchError || !session) {
      return { success: false, error: 'Invalid refresh token' };
    }

    // Generate new token
    const newToken = generateToken();
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + CLIENT_SESSION_HOURS);

    // Update session
    const { error: updateError } = await supabase
      .from('auth_sessions')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      return { success: false, error: 'Failed to refresh token' };
    }

    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_TOKEN_KEY, newToken);
    }

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Client Logout
 */
export async function clientLogout(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(CLIENT_TOKEN_KEY);
    if (token) {
      await supabase
        .from('auth_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: 'logout',
        })
        .eq('token', token);
    }

    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_SESSION_KEY);
  } catch (error) {
    console.error('Client logout error:', error);
  }
}

/**
 * Guest Logout
 */
export async function guestLogout(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (token) {
      await supabase
        .from('guest_sessions')
        .delete()
        .eq('session_token', token);
    }

    localStorage.removeItem(GUEST_TOKEN_KEY);
    localStorage.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.error('Guest logout error:', error);
  }
}

/**
 * Get current session type
 */
export function getCurrentSessionType(): 'client' | 'guest' | null {
  if (typeof window === 'undefined') return null;

  if (localStorage.getItem(CLIENT_TOKEN_KEY)) {
    return 'client';
  }
  if (localStorage.getItem(GUEST_TOKEN_KEY)) {
    return 'guest';
  }
  return null;
}

/**
 * Get current session data
 */
export function getCurrentSession(): ClientSession | GuestSession | null {
  if (typeof window === 'undefined') return null;

  const clientSession = localStorage.getItem(CLIENT_SESSION_KEY);
  if (clientSession) {
    return JSON.parse(clientSession) as ClientSession;
  }

  const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
  if (guestSession) {
    return JSON.parse(guestSession) as GuestSession;
  }

  return null;
}

/**
 * Log audit event
 */
async function logAuditEvent(
  action: string,
  actorType: 'god' | 'client' | 'guest' | 'system',
  actorId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      action,
      actor_type: actorType,
      actor_id: actorId,
      details,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
