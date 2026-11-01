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
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'ADMIN_API_KEY is not configured on the server' });
  }
  const provided = req.headers['x-admin-key'];
  if (!provided) return res.status(401).json({ error: 'Missing X-Admin-Key' });
  if (!timingSafeEqualString(provided, expected)) return res.status(401).json({ error: 'Invalid admin key' });
  next();
}

// Merchant auth guard: supports X-API-Key or merchant session token
export async function merchantAuth(req, res, next) {
  const supabase = requireAdmin();
  
  // Try session token first
  const authHeader = req.headers['authorization'];
  const tokenHeader = req.headers['x-merchant-token'] || req.headers['x-token'];
  const token = tokenHeader || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const { data: session, error: sessErr } = await supabase
        .from('merchant_sessions')
        .select('merchant_id, expires_at')
        .eq('token_hash', tokenHash)
        .single();
      
      if (sessErr || !session) {
        return res.status(401).json({ error: 'Invalid session token' });
      }
      if (new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }
      
      const { data: merchant, error: merchErr } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', session.merchant_id)
        .eq('is_active', true)
        .single();
      
      if (merchErr || !merchant) {
        return res.status(401).json({ error: 'Merchant not found or inactive' });
      }
      
      req.merchant = merchant;
      req.merchantSession = session;
      return next();
    } catch (e) {
      console.error('[merchantAuth] token error:', e.message);
    }
  }
  
  // Fallback to API key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing authentication' });
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
