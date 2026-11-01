import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { adminAuth, isValidAdminKey, merchantAuth } from '../middleware/auth.js';
import { generateRandomToken } from '../../../../packages/shared/src/crypto.js';

const router = express.Router();

// Create merchant (admin). Returns api_key + webhook_secret ONCE.
router.post('/', adminAuth, async (req, res) => {
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
  }).select('id,business_name,webhook_url,branding,is_active,created_at,updated_at,owner_id').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({
    merchant: data,
    credentials: { api_key: apiKey, webhook_secret: webhookSecret }, // shown once
  });
});

// Get current merchant from API key
router.get('/me', merchantAuth, async (req, res) => {
  res.json({ merchant: req.merchant });
});

router.get('/', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('merchants').select('id,business_name,webhook_url,branding,is_active,created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ merchants: data });
});

router.get('/:id', async (req, res) => {
  const supabase = requireAdmin();
  // Public callers (observer app) only get the merchant profile. Admin calls
  // with a valid X-Admin-Key additionally get webhook config, but never secrets.
  const isAdmin = isValidAdminKey(req.headers['x-admin-key']);
  const fields = isAdmin
    ? 'id,business_name,webhook_url,branding,is_active,created_at,updated_at'
    : 'id,business_name,branding,is_active,created_at';
  const { data, error } = await supabase.from('merchants').select(fields).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'not found' });
  res.json({ merchant: data });
});

// Regenerate API key (shown once)
router.post('/:id/regenerate-key', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const { data: merchant } = await supabase.from('merchants').select('id').eq('id', req.params.id).single();
  if (!merchant) return res.status(404).json({ error: 'not found' });
  const apiKey = 'mk_live_' + generateRandomToken(24);
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  await supabase.from('merchants').update({ api_key_hash: apiKeyHash }).eq('id', req.params.id);
  res.json({ api_key: apiKey, message: 'New API key generated. Save it — shown once.' });
});

// Approve merchant
router.post('/:id/approve', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from('merchants')
    .update({ status: 'APPROVED', is_active: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id,business_name,mobile,email,status,is_active')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json({ merchant: data, message: 'Merchant approved' });
});

// Reject/disable merchant
router.post('/:id/reject', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from('merchants')
    .update({ status: 'REJECTED', is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id,business_name,mobile,email,status,is_active')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json({ merchant: data, message: 'Merchant rejected' });
});

router.put('/:id', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const patch = {};
  if (req.body.business_name) patch.business_name = req.body.business_name;
  if (req.body.webhook_url !== undefined) patch.webhook_url = req.body.webhook_url;
  if (req.body.branding) patch.branding = req.body.branding;
  if (req.body.is_active !== undefined) patch.is_active = req.body.is_active;
  if (req.body.status) patch.status = req.body.status;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('merchants')
    .update(patch)
    .eq('id', req.params.id)
    .select('id,business_name,webhook_url,branding,is_active,created_at,updated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ merchant: data });
});

export default router;
