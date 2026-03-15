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

function clearLegacyTokenStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_TOKEN_KEY);
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

/**
 * Client Login (username/password)
 */
export async function clientLogin(username: string, password: string): Promise<{
  success: boolean;
  error?: string;
  client?: Client;
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

    const accessToken = authData.session?.access_token;
    if (!accessToken) {
      return { success: false, error: 'Failed to create session' };
    }

    const sessionResponse = await fetch('/api/auth/client-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    const sessionData = await sessionResponse.json();
    if (!sessionResponse.ok || !sessionData.session) {
      console.error('Failed to create session:', sessionData);
      await supabase.auth.signOut().catch(() => undefined);
      return { success: false, error: sessionData.message || sessionData.error || 'Failed to create session' };
    }

    if (typeof window !== 'undefined') {
      clearLegacyTokenStorage();
      localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(sessionData.session as ClientSession));
    }

    return {
      success: true,
      client,
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
  accessType?: 'guest' | 'admin';
  weddingSlug?: string;
}> {
  try {
    const response = await fetch('/api/auth/guest-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, guestName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Invalid access code' };
    }

    const { wedding_id, wedding_slug, access_type, guest_name } = data;

    if (typeof window !== 'undefined') {
      clearLegacyTokenStorage();
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
        client_id: wedding_id,
        wedding_slug,
        access_type,
        guest_name,
      } as GuestSession));
    }

    return {
      success: true,
      accessType: access_type,
      weddingSlug: wedding_slug,
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

    const response = await fetch('/api/auth/client-session');
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.session) {
      clearLegacyTokenStorage();
      localStorage.removeItem(CLIENT_SESSION_KEY);
      return { valid: false };
    }

    const clientSession = data.session as ClientSession;
    localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(clientSession));

    return {
      valid: true,
      session: clientSession,
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

    const response = await fetch('/api/auth/guest-session');
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.session) {
      clearLegacyTokenStorage();
      localStorage.removeItem(GUEST_SESSION_KEY);
      return { valid: false };
    }

    const guestSession = data.session as GuestSession;
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));

    return {
      valid: true,
      session: guestSession,
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
  void refreshToken;
  return {
    success: false,
    error: 'Refresh token flow has been replaced by HttpOnly session cookies.',
  };
}

/**
 * Client Logout
 */
export async function clientLogout(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    await fetch('/api/auth/client-session', { method: 'DELETE' }).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    clearLegacyTokenStorage();
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

    await fetch('/api/auth/guest-session', { method: 'DELETE' }).catch(() => undefined);
    clearLegacyTokenStorage();
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

  if (localStorage.getItem(CLIENT_SESSION_KEY)) {
    return 'client';
  }
  if (localStorage.getItem(GUEST_SESSION_KEY)) {
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
