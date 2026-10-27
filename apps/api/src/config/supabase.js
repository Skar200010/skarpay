import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url) {
  console.warn('[supabase] SUPABASE_URL not set; running in stub mode');
}

// Service-role client: bypasses RLS for backend privileged ops (state machine, observers, webhooks).
export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

// Anon client: respects RLS; used for merchant-scoped reads when a user JWT is present.
export const supabaseAnon = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

export function requireSupabase() {
  if (!supabaseAdmin) throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}
