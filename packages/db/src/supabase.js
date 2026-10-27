import { createClient } from '@supabase/supabase-js';

let admin = null;
let anon = null;

export function initSupabase({ url, serviceKey, anonKey }) {
  if (url && serviceKey) admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (url && anonKey) anon = createClient(url, anonKey, { auth: { persistSession: false } });
  return { admin, anon };
}

export function getAdmin() { return admin; }
export function getAnon() { return anon; }
export function requireAdmin() {
  if (!admin) throw new Error('Supabase admin client not initialized. Call initSupabase first.');
  return admin;
}
