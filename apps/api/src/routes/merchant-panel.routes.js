import express from 'express';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { merchantAuth } from '../middleware/auth.js';
import { createEnrollmentToken, ENROLLMENT_TOKEN_TTL_MS } from '../services/enrollment.js';

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

// Payments summary for the KPI cards
router.get('/payments/summary', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [all, today] = await Promise.all([
    supabase.from('payment_sessions').select('status, amount_paise').eq('merchant_id', merchantId),
    supabase
      .from('payment_sessions')
      .select('amount_paise, status')
      .eq('merchant_id', merchantId)
      .gte('created_at', since.toISOString()),
  ]);

  if (all.error) return res.status(500).json({ error: all.error.message });
  if (today.error) return res.status(500).json({ error: today.error.message });

  const rows = all.data || [];
  const todayRows = today.data || [];
  const sum = (list, predicate) =>
    list.reduce((acc, row) => (predicate(row) ? acc + (row.amount_paise || 0) : acc), 0);

  const total = rows.length;
  const successful = rows.filter((r) => r.status === 'SUCCESS').length;
  const collected = sum(rows, (r) => r.status === 'SUCCESS');
  const cancelled = rows.filter((r) => r.status === 'CANCELLED' || r.status === 'EXPIRED').length;
  const cancelledAmount = sum(rows, (r) => r.status === 'CANCELLED' || r.status === 'EXPIRED');

  res.json({
    summary: {
      total_payments: total,
      successful,
      success_rate: total > 0 ? Math.round((successful / total) * 100) : null,
      avg_ticket: successful > 0 ? Math.round(collected / successful) : 0,
      cancelled,
      cancelled_amount: cancelledAmount,
      today_amount: sum(todayRows, (r) => r.status === 'SUCCESS'),
      today_count: todayRows.filter((r) => r.status === 'SUCCESS').length,
      today_total: todayRows.length,
    },
  });
});

// Payments list
router.get('/payments', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  const { status, method, q, from, to, limit = 25, offset = 0 } = req.query;

  const take = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);

  let query = supabase
    .from('payment_sessions')
    .select(
      'id,order_id,amount_paise,currency,method,status,utr,created_at,updated_at,receiving_account_id,customer:customers(name, mobile_number)',
      { count: 'exact' },
    )
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(skip, skip + take - 1);

  if (status && status !== 'ALL') {
    const statuses = String(status)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (statuses.length === 1) query = query.eq('status', statuses[0]);
    else if (statuses.length > 1) query = query.in('status', statuses);
  }

  if (method && method !== 'ALL') query = query.eq('method', method);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  if (q) {
    const term = String(q).replace(/[%,()]/g, '').trim();
    if (term) query = query.or(`order_id.ilike.%${term}%,utr.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ payments: data || [], total: count ?? (data || []).length, limit: take, offset: skip });
});

// Devices
router.get('/devices', merchantAuth, async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.merchant.id;
  
  const { data, error } = await supabase
    .from('devices')
    .select('id,device_name,device_model,is_active,last_heartbeat_at,created_at')
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

// Issue a short-lived pairing token scoped to this merchant. The Android
// observer app exchanges it for device credentials at /pollers/android/pair.
router.get('/enrollment-token', merchantAuth, async (req, res) => {
  try {
    const token = createEnrollmentToken(req.merchant.id);
    res.json({ token, expiresAt: Date.now() + ENROLLMENT_TOKEN_TTL_MS });
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});

export default router;
