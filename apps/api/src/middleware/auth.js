import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import crypto from 'node:crypto';

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
