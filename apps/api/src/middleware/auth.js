import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import crypto from 'node:crypto';

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

// Admin guard for console-only endpoints (merchant management, counters, etc).
// Requires the ADMIN_API_KEY env var; fails closed when it is not configured.
export function isValidAdminKey(provided) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !provided) return false;
  return timingSafeEqualString(provided, expected);
}

export function adminAuth(req, res, next) {
  if (!process.env.ADMIN_API_KEY) {
    return res.status(503).json({ error: 'ADMIN_API_KEY is not configured on the server' });
  }
  const provided = req.headers['x-admin-key'];
  if (!provided) return res.status(401).json({ error: 'Missing X-Admin-Key' });
  if (!isValidAdminKey(provided)) return res.status(401).json({ error: 'Invalid admin key' });
  next();
}

// Merchant API key guard: reads X-API-Key, hashes, looks up merchant.
export async function merchantAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key' });
  const supabase = requireAdmin();
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('api_key_hash', hash)
    .eq('is_active', true)
    .single();
  if (error || !merchant) return res.status(401).json({ error: 'Invalid API key' });
  req.merchant = merchant;
  next();
}
