import express from 'express';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { merchantAuth } from '../middleware/auth.js';

const router = express.Router();

// Dashboard stats
router.get('/dashboard', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [total, success, pending, todayData] = await Promise.all([
    supabase.from('payment_sessions').select('amount_paise', { count: 'exact' }).eq('merchant_id', merchantId),
    supabase.from('payment_sessions').select('amount_paise').eq('merchant_id', merchantId).eq('status', 'SUCCESS'),
    supabase.from('payment_sessions').select('amount_paise', { count: 'exact' }).eq('merchant_id', merchantId).in('status', ['ACTIVE', 'QUEUED', 'PROCESSING']),
    supabase.from('payment_sessions').select('amount_paise').eq('merchant_id', merchantId).eq('status', 'SUCCESS').gte('created_at', today.toISOString())
  ]);
  
  const totalAmount = success.data?.reduce((sum, s) => sum + (s.amount_paise || 0), 0) || 0;
  const todayAmount = todayData.data?.reduce((sum, s) => sum + (s.amount_paise || 0), 0) || 0;
  
  res.json({
    stats: {
      total_payments: total.count || 0,
      successful: success.data?.length || 0,
      pending: pending.count || 0,
      total_amount: totalAmount,
      today_amount: todayAmount
    }
  });
});

// Payments list
router.get('/payments', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  const { status, limit = 50 } = req.query;
  
  let q = supabase
    .from('payment_sessions')
    .select('id,order_id,amount_paise,currency,status,utr,created_at,updated_at,receiving_account_id')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));
  
  if (status) q = q.eq('status', status);
  
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ payments: data });
});

// Devices
router.get('/devices', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  
  const { data, error } = await supabase
    .from('devices')
    .select('id,device_name,device_model,platform,last_seen_at,created_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ devices: data });
});

// Revoke device
router.delete('/devices/:id', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', req.params.id)
    .eq('merchant_id', merchantId)
    .single();
  
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  await supabase.from('devices').delete().eq('id', req.params.id);
  res.json({ message: 'Device revoked' });
});

// Update branding/customizer
router.put('/branding', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  const { branding } = req.body || {};
  
  const { data, error } = await supabase
    .from('merchants')
    .update({ branding: branding || {}, updated_at: new Date().toISOString() })
    .eq('id', merchantId)
    .select('branding')
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ branding: data.branding });
});

// Get branding
router.get('/branding', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  
  const { data } = await supabase
    .from('merchants')
    .select('branding')
    .eq('id', merchantId)
    .single();
  
  res.json({ branding: data?.branding || {} });
});

export default router;
