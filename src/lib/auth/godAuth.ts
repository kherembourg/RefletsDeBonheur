/**
 * God Admin Authentication System
 * Handles authentication, sessions, and client impersonation
 */

import { supabase } from '../supabase/client';

// Types
export interface GodAdmin {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

export interface Client {
  id: string;
  wedding_name: string;
  couple_names: string;
  wedding_date: string | null;
  wedding_slug: string;
  username: string;
  email: string;
  guest_code: string;
  admin_code: string;
  allow_uploads: boolean;
  allow_guestbook: boolean;
  theme: string;
  custom_domain: string | null;
  status: 'active' | 'expired' | 'trial';
  subscription_started_at: string;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  photo_count: number;
  video_count: number;
  message_count: number;
  storage_used_mb: number;
}

export interface AuthSession {
  id: string;
  user_id: string;
  user_type: 'god' | 'client' | 'guest';
  token: string;
  expires_at: string;
  created_at: string;
}

export interface GodAccessToken {
  id: string;
  god_admin_id: string;
  wedding_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

// Storage keys
const GOD_TOKEN_KEY = 'reflets_god_token';
const GOD_SESSION_KEY = 'reflets_god_session';

// Token expiration times
const SESSION_DURATION_HOURS = 24;
const GOD_ACCESS_TOKEN_DURATION_HOURS = 24; // 24-hour TTL for god access tokens

const CLIENT_CREATE_ENDPOINT = '/api/admin/create-client';

/**
 * Generate a secure random token
 */
function generateToken(length: number = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * God Admin Login
 */
export async function godLogin(username: string, password: string): Promise<{
  success: boolean;
  error?: string;
  admin?: GodAdmin;
  token?: string;
}> {
  try {
    // Call Supabase to verify credentials
    const { data: admin, error: fetchError } = await supabase
      .from('god_admins')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (fetchError || !admin) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Verify password using the database function
    const { data: isValid, error: verifyError } = await supabase
      .rpc('verify_password', {
        input_password: password,
        stored_hash: admin.password_hash
      });

    if (verifyError || !isValid) {
      // Log failed attempt
      await logAuditEvent('god_login_failed', 'god', admin.id, { username });
      return { success: false, error: 'Invalid username or password' };
    }

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    // Create session in database
    const { error: sessionError } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: admin.id,
        user_type: 'god',
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return { success: false, error: 'Failed to create session' };
    }

    // Update last login
    await supabase
      .from('god_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Log successful login
    await logAuditEvent('god_login_success', 'god', admin.id, { username });

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(GOD_TOKEN_KEY, token);
      localStorage.setItem(GOD_SESSION_KEY, JSON.stringify({
        id: admin.id,
        username: admin.username,
        email: admin.email,
      }));
    }

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        created_at: admin.created_at,
        last_login_at: admin.last_login_at,
        is_active: admin.is_active,
      },
      token,
    };
  } catch (error) {
    console.error('God login error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Verify God Admin Session
 */
export async function verifyGodSession(): Promise<{
  valid: boolean;
  admin?: GodAdmin;
}> {
  try {
    if (typeof window === 'undefined') {
      return { valid: false };
    }

    const token = localStorage.getItem(GOD_TOKEN_KEY);
    if (!token) {
      return { valid: false };
    }

    // Verify token in database
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('token', token)
      .eq('user_type', 'god')
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      // Clear invalid session
      localStorage.removeItem(GOD_TOKEN_KEY);
      localStorage.removeItem(GOD_SESSION_KEY);
      return { valid: false };
    }

    // Fetch the god admin separately
    const { data: admin, error: adminError } = await supabase
      .from('god_admins')
      .select('*')
      .eq('id', session.user_id)
      .single();

    if (adminError || !admin) {
      localStorage.removeItem(GOD_TOKEN_KEY);
      localStorage.removeItem(GOD_SESSION_KEY);
      return { valid: false };
    }

    // Update last used
    await supabase
      .from('auth_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.id);

    return {
      valid: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        created_at: admin.created_at,
        last_login_at: admin.last_login_at,
        is_active: admin.is_active,
      },
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return { valid: false };
  }
}

/**
 * God Admin Logout
 */
export async function godLogout(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(GOD_TOKEN_KEY);
    if (token) {
      // Revoke session in database
      await supabase
        .from('auth_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: 'logout',
        })
        .eq('token', token);
    }

    // Clear local storage
    localStorage.removeItem(GOD_TOKEN_KEY);
    localStorage.removeItem(GOD_SESSION_KEY);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Get all clients for god dashboard
 */
export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('weddings')
    .select('*, profiles:owner_id(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch clients:', error);
    return [];
  }

  return (data || []).map((wedding) => {
    const profile = Array.isArray(wedding.profiles) ? wedding.profiles[0] : wedding.profiles;
    const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`.trim();
    const weddingName = (wedding.name || `Mariage de ${coupleNames}`.trim()).trim();

    return {
      id: wedding.owner_id,
      wedding_name: weddingName,
      couple_names: coupleNames,
      wedding_date: wedding.wedding_date,
      wedding_slug: wedding.slug,
      username: profile?.email || '',
      email: profile?.email || '',
      guest_code: wedding.pin_code || '',
      admin_code: wedding.magic_token,
      allow_uploads: wedding.config.features.gallery,
      allow_guestbook: wedding.config.features.guestbook,
      theme: wedding.config.theme.name,
      custom_domain: null,
      status: profile?.subscription_status === 'active' || profile?.subscription_status === 'trial' ? profile?.subscription_status : 'expired',
      subscription_started_at: profile?.created_at || wedding.created_at,
      subscription_expires_at: profile?.subscription_end_date || null,
      created_at: profile?.created_at || wedding.created_at,
      updated_at: profile?.updated_at || wedding.updated_at,
      last_login_at: null,
      photo_count: 0,
      video_count: 0,
      message_count: 0,
      storage_used_mb: 0,
    };
  });
}

/**
 * Get single client by ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('weddings')
    .select('*, profiles:owner_id(*)')
    .eq('owner_id', clientId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch client:', error);
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const coupleNames = `${data.bride_name} & ${data.groom_name}`.trim();
    const weddingName = (data.name || `Mariage de ${coupleNames}`.trim()).trim();

  return {
    id: data.owner_id,
    wedding_name: weddingName,

    couple_names: coupleNames,
    wedding_date: data.wedding_date,
    wedding_slug: data.slug,
    username: profile?.email || '',
    email: profile?.email || '',
    guest_code: data.pin_code || '',
    admin_code: data.magic_token,
    allow_uploads: data.config.features.gallery,
    allow_guestbook: data.config.features.guestbook,
    theme: data.config.theme.name,
    custom_domain: null,
    status: profile?.subscription_status === 'active' || profile?.subscription_status === 'trial' ? profile?.subscription_status : 'expired',
    subscription_started_at: profile?.created_at || data.created_at,
    subscription_expires_at: profile?.subscription_end_date || null,
    created_at: profile?.created_at || data.created_at,
    updated_at: profile?.updated_at || data.updated_at,
    last_login_at: null,
    photo_count: 0,
    video_count: 0,
    message_count: 0,
    storage_used_mb: 0,
  };
}

/**
 * Create a new client
 */
export async function createClient(clientData: {
  wedding_name: string;
  couple_names: string;
  wedding_date?: string;
  wedding_slug: string;
  username?: string;
  password: string;
  email: string;
}): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    const response = await fetch(CLIENT_CREATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData),
    });

    const payload = await response.json();

    if (!response.ok) {
      return { success: false, error: payload.message || 'Failed to create client' };
    }

    return { success: true, client: payload.client as Client };
  } catch (error) {
    console.error('Create client error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: 'active' | 'expired' | 'trial'
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (error) {
    console.error('Failed to update client status:', error);
    return false;
  }

  await logAuditEvent('client_status_changed', 'god', null, {
    client_id: clientId,
    new_status: status,
  });

  return true;
}

/**
 * Generate impersonation token for god to access client interface
 */
export async function createImpersonationToken(
  godAdminId: string,
  clientId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Validate inputs
    if (!godAdminId || !clientId) {
      return { success: false, error: 'Invalid god admin ID or client ID' };
    }

    const token = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + GOD_ACCESS_TOKEN_DURATION_HOURS);

    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id')
      .eq('owner_id', clientId)
      .single();

    if (weddingError || !wedding) {
      return { success: false, error: 'Wedding not found' };
    }

    const { error } = await supabase
      .from('god_access_tokens')
      .insert({
        god_admin_id: godAdminId,
        wedding_id: wedding.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      return { success: false, error: 'Failed to create access token' };
    }

    await logAuditEvent('impersonation_token_created', 'god', godAdminId, {
      wedding_id: wedding.id,
    });

    return { success: true, token };
  } catch (error) {
    console.error('Create impersonation token error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Verify and use impersonation token
 */
export async function verifyImpersonationToken(token: string): Promise<{
  valid: boolean;
  client?: Client;
  error?: string;
}> {
  try {
    const { data: accessToken, error } = await supabase
      .from('god_access_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !accessToken) {
      return { valid: false, error: 'Invalid or expired access token' };
    }

    if (accessToken.used_count >= accessToken.max_uses) {
      return { valid: false, error: 'Access token has been used' };
    }

    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', accessToken.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return { valid: false, error: 'Wedding not found' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile) {
      return { valid: false, error: 'Profile not found' };
    }

    const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`.trim();
    const weddingName = (wedding.name || `Mariage de ${coupleNames}`.trim()).trim();
    const client: Client = {
      id: wedding.owner_id,
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

    await supabase
      .from('god_access_tokens')
      .update({
        used_at: new Date().toISOString(),
        used_count: accessToken.used_count + 1,
      })
      .eq('id', accessToken.id);

    await logAuditEvent('impersonation_token_used', 'god', accessToken.god_admin_id, {
      wedding_id: wedding.id,
    });

    return {
      valid: true,
      client,
    };
  } catch (error) {
    console.error('Verify impersonation token error:', error);
    return { valid: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .select('id')
    .eq('owner_id', clientId)
    .single();

  if (weddingError) {
    console.error('Failed to fetch wedding for deletion:', weddingError);
    return false;
  }

  if (wedding) {
    const { error: weddingDeleteError } = await supabase
      .from('weddings')
      .delete()
      .eq('id', wedding.id);

    if (weddingDeleteError) {
      console.error('Failed to delete wedding:', weddingDeleteError);
      return false;
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', clientId);

  if (profileError) {
    console.error('Failed to delete profile:', profileError);
    return false;
  }

  await logAuditEvent('client_deleted', 'god', null, { client_id: clientId });

  return true;
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

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<{
  totalClients: number;
  activeClients: number;
  trialClients: number;
  totalPhotos: number;
  totalMessages: number;
  totalStorageMB: number;
  recentClients: Client[];
}> {
  try {
    const clients = await getAllClients();

    const stats = clients.reduce(
      (acc, client) => ({
        totalPhotos: acc.totalPhotos + (client.photo_count || 0),
        totalMessages: acc.totalMessages + (client.message_count || 0),
        totalStorageMB: acc.totalStorageMB + (client.storage_used_mb || 0),
      }),
      { totalPhotos: 0, totalMessages: 0, totalStorageMB: 0 }
    );

    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      trialClients: clients.filter(c => c.status === 'trial').length,
      totalPhotos: stats.totalPhotos,
      totalMessages: stats.totalMessages,
      totalStorageMB: stats.totalStorageMB,
      recentClients: clients.slice(0, 5),
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return {
      totalClients: 0,
      activeClients: 0,
      trialClients: 0,
      totalPhotos: 0,
      totalMessages: 0,
      totalStorageMB: 0,
      recentClients: [],
    };
  }
}

/**
 * Clean up expired god access tokens
 * This function removes tokens that have exceeded their 24-hour TTL
 * @returns The number of deleted tokens
 */
export async function cleanupExpiredGodTokens(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    const now = new Date().toISOString();

    // Delete expired god access tokens
    const { data, error } = await supabase
      .from('god_access_tokens')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return { success: false, deletedCount: 0, error: error.message };
    }

    const deletedCount = data?.length || 0;

    if (deletedCount > 0) {
      await logAuditEvent('god_tokens_cleanup', 'system', null, {
        deleted_count: deletedCount,
        cleanup_time: now,
      });
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { success: false, deletedCount: 0, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if a god access token is expired
 * @param tokenId The ID of the token to check
 * @returns Whether the token is valid (not expired)
 */
export async function isGodTokenValid(tokenId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('god_access_tokens')
      .select('id, expires_at, used_count, max_uses')
      .eq('id', tokenId)
      .single();

    if (error || !data) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    // Check if expired
    if (expiresAt <= now) {
      return false;
    }

    // Check if max uses exceeded
    if (data.used_count >= data.max_uses) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Get token expiration time
 * @param token The token string to check
 * @returns The expiration date or null if not found
 */
export async function getTokenExpiration(token: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('god_access_tokens')
      .select('expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.expires_at);
  } catch (error) {
    console.error('Get token expiration error:', error);
    return null;
  }
}

// Export constants for testing
export const GOD_TOKEN_TTL_HOURS = GOD_ACCESS_TOKEN_DURATION_HOURS;
export const GOD_SESSION_TTL_HOURS = SESSION_DURATION_HOURS;
