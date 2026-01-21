import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

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
