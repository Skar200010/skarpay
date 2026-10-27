import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateRandomToken } from '../../../../packages/shared/src/crypto.js';

const router = express.Router();

// Create merchant (admin). Returns api_key + webhook_secret ONCE.
router.post('/', async (req, res) => {
  const { business_name, webhook_url, owner_id } = req.body || {};
  if (!business_name) return res.status(400).json({ error: 'business_name required' });
  const supabase = requireAdmin();
  const apiKey = 'mk_live_' + generateRandomToken(24);
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const webhookSecret = generateRandomToken(32);
  const { data, error } = await supabase.from('merchants').insert({
    business_name,
    api_key_hash: apiKeyHash,
    webhook_secret: webhookSecret,
    webhook_url: webhook_url || null,
    owner_id: owner_id || null,
    branding: {},
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({
    merchant: data,
    credentials: { api_key: apiKey, webhook_secret: webhookSecret }, // shown once
  });
});

router.get('/', async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('merchants').select('id,business_name,webhook_url,branding,is_active,created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ merchants: data });
});

router.get('/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('merchants').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'not found' });
  res.json({ merchant: data });
});

router.put('/:id', async (req, res) => {
  const supabase = requireAdmin();
  const patch = {};
  if (req.body.business_name) patch.business_name = req.body.business_name;
  if (req.body.webhook_url !== undefined) patch.webhook_url = req.body.webhook_url;
  if (req.body.branding) patch.branding = req.body.branding;
  if (req.body.is_active !== undefined) patch.is_active = req.body.is_active;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('merchants').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ merchant: data });
});

export default router;
