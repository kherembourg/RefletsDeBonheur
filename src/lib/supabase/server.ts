import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let adminClient: SupabaseClient<Database> | null = null;

export function isSupabaseServiceRoleConfigured(): boolean {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role key not configured. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}
