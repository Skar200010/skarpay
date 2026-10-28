import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { toPaise } from '../../../../packages/shared/src/money.js';
import { assertTransition } from '../services/state-machine.js';
import { generateQrSvg } from '../services/qr.service.js';
import { deliverWebhook } from '../services/webhook.service.js';
import { merchantAuth } from '../middleware/auth.js';
import { isBanned } from '../services/fraud.service.js';

const router = express.Router();
router.use(merchantAuth);

// Create receiving account (VPA) for merchant
router.post('/accounts', async (req, res) => {
  const { vpa, account_name, daily_limit_paise } = req.body || {};
  if (!vpa) return res.status(400).json({ error: 'vpa required' });
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('receiving_accounts').insert({
    merchant_id: req.merchant.id,
    vpa,
    account_name: account_name || null,
    daily_limit_paise: daily_limit_paise || 0,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ account: data });
});

router.get('/accounts', async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('receiving_accounts').select('*').eq('merchant_id', req.merchant.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ accounts: data });
});

// Edit VPA
router.put('/accounts/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { vpa, account_name, daily_limit_paise, is_active } = req.body || {};
  const patch = {};
  if (vpa) patch.vpa = vpa;
  if (account_name !== undefined) patch.account_name = account_name;
  if (daily_limit_paise !== undefined) patch.daily_limit_paise = daily_limit_paise;
  if (is_active !== undefined) patch.is_active = is_active;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('receiving_accounts').update(patch).eq('id', req.params.id).eq('merchant_id', req.merchant.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ account: data });
});

// Remove VPA
router.delete('/accounts/:id', async (req, res) => {
  const supabase = requireAdmin();
  // Check if any active sessions
  const { data: sessions } = await supabase.from('payment_sessions').select('id').eq('receiving_account_id', req.params.id).in('status', ['ACTIVE', 'PROCESSING', 'QUEUED']);
  if (sessions && sessions.length > 0) {
    return res.status(400).json({ error: 'Cannot delete: active sessions exist on this VPA' });
  }
  const { error } = await supabase.from('receiving_accounts').delete().eq('id', req.params.id).eq('merchant_id', req.merchant.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

// Toggle VPA active/inactive
router.put('/accounts/:id/toggle', async (req, res) => {
  const supabase = requireAdmin();
  const { data: acct } = await supabase.from('receiving_accounts').select('is_active').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (!acct) return res.status(404).json({ error: 'not found' });
  const { data, error } = await supabase.from('receiving_accounts').update({ is_active: !acct.is_active }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ account: data });
});

// Set default VPA for merchant
router.put('/accounts/:id/default', async (req, res) => {
  const supabase = requireAdmin();
  const { data: acct } = await supabase.from('receiving_accounts').select('id').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (!acct) return res.status(404).json({ error: 'not found' });
  // Store default in merchant branding
  const { data: merchant } = await supabase.from('merchants').select('branding').eq('id', req.merchant.id).single();
  const branding = merchant?.branding || {};
  branding.defaultVpaId = req.params.id;
  await supabase.from('merchants').update({ branding }).eq('id', req.merchant.id);
  res.json({ defaultVpaId: req.params.id });
});

// Create payment session
router.post('/', async (req, res) => {
  const { order_id, amount, currency, customer, metadata, receiving_account_id, method } = req.body || {};
  if (!order_id || !amount) return res.status(400).json({ error: 'order_id and amount required' });
  let amountPaise;
  try { amountPaise = toPaise(amount); } catch (e) { return res.status(400).json({ error: e.message }); }
  const supabase = requireAdmin();

  // Pick receiving account
  let account = null;
  if (receiving_account_id) {
    const { data } = await supabase.from('receiving_accounts').select('*').eq('id', receiving_account_id).eq('merchant_id', req.merchant.id).single();
    account = data;
  } else {
    // Check for default VPA in branding
    const defaultVpaId = req.merchant.branding?.defaultVpaId;
    if (defaultVpaId) {
      const { data } = await supabase.from('receiving_accounts').select('*').eq('id', defaultVpaId).eq('merchant_id', req.merchant.id).eq('is_active', true).single();
      account = data;
    }
    if (!account) {
      const { data } = await supabase.from('receiving_accounts').select('*').eq('merchant_id', req.merchant.id).eq('is_active', true).limit(1).single();
      account = data;
    }
  }
  if (!account) return res.status(400).json({ error: 'no receiving account configured' });

  // Fraud check
  if (customer && customer.phone) {
    const banned = await isBanned(customer.phone);
    if (banned) return res.status(403).json({ error: 'customer is banned' });
  }

  // Customer upsert (optional)
  let customerId = null;
  if (customer && customer.phone) {
    const { data: existing } = await supabase.from('customers').select('id').eq('mobile_number', customer.phone).single();
    if (existing) customerId = existing.id;
    else {
      const { data: created } = await supabase.from('customers').insert({
        mobile_number: customer.phone,
        name: customer.name || null,
        email: customer.email || null,
      }).select('id').single();
      customerId = created?.id || null;
    }
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: session, error } = await supabase.from('payment_sessions').insert({
    merchant_id: req.merchant.id,
    customer_id: customerId,
    receiving_account_id: account.id,
    order_id,
    amount_paise: Number(amountPaise),
    currency: currency || 'INR',
    method: method || 'UPI',
    status: 'INITIATED',
    expires_at: expiresAt,
    metadata: metadata || {},
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Activate immediately if slot free
  if (!account.is_slot_busy) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: true }).eq('id', account.id);
    assertTransition('INITIATED', 'ACTIVE');
    await supabase.from('payment_sessions').update({ status: 'ACTIVE', activated_at: new Date().toISOString() }).eq('id', session.id);
    session.status = 'ACTIVE';
  } else {
    // compute next queue position
    const { data: maxRow } = await supabase
      .from('payment_sessions')
      .select('queue_position')
      .eq('receiving_account_id', account.id)
      .eq('status', 'QUEUED')
      .order('queue_position', { ascending: false })
      .limit(1)
      .single();
    const nextPos = (maxRow?.queue_position || 0) + 1;
    assertTransition('INITIATED', 'QUEUED');
    await supabase.from('payment_sessions').update({ status: 'QUEUED', queue_position: nextPos }).eq('id', session.id);
    session.status = 'QUEUED';
  }

  res.status(201).json({
    paymentId: session.id,
    orderId: order_id,
    amount: amountPaise.toString(),
    status: session.status,
    expiresAt,
    checkoutUrl: `${process.env.CHECKOUT_URL || 'http://localhost:5174'}/checkout/${session.id}`,
  });
});

// List payments for merchant
router.get('/', async (req, res) => {
  const supabase = requireAdmin();
  const limit = parseInt(req.query.limit || '50', 10);
  const { data, error } = await supabase
    .from('payment_sessions')
    .select('id, order_id, amount_paise, currency, method, status, utr, created_at, expires_at')
    .eq('merchant_id', req.merchant.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ payments: data || [] });
});

// Get payment status
router.get('/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { data, error } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (error || !data) return res.status(404).json({ error: 'not found' });
  res.json({ payment: data });
});

// Manual verification (dev/test + observer-driven)
router.post('/:id/verify', async (req, res) => {
  const { utr, amount } = req.body || {};
  const supabase = requireAdmin();
  const { data: session, error } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (error || !session) return res.status(404).json({ error: 'not found' });

  // amount check
  let observedPaise = session.amount_paise;
  if (amount) {
    try { observedPaise = Number(toPaise(amount)); } catch (e) { return res.status(400).json({ error: e.message }); }
  }
  if (observedPaise !== session.amount_paise) {
    assertTransition(session.status, 'FAILED');
    await supabase.from('payment_sessions').update({ status: 'FAILED', utr: utr || null }).eq('id', session.id);
    await supabase.from('audit_logs').insert({ session_id: session.id, event_type: 'VERIFY_MISMATCH', details: { expected: session.amount_paise, observed: observedPaise } });
    return res.json({ status: 'FAILED', reason: 'amount mismatch' });
  }

  assertTransition(session.status, 'SUCCESS');
  await supabase.from('payment_sessions').update({ status: 'SUCCESS', utr: utr || null }).eq('id', session.id);
  await supabase.from('audit_logs').insert({ session_id: session.id, event_type: 'VERIFY_SUCCESS', details: { utr } });

  // release slot
  if (session.receiving_account_id) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
  }

  // webhook delivery (best-effort)
  try {
    await deliverWebhook({
      url: req.merchant.webhook_url,
      secret: req.merchant.webhook_secret,
      payload: {
        event: 'SUCCESS',
        paymentId: session.id,
        orderId: session.order_id,
        amount: (session.amount_paise / 100).toFixed(2),
        amountPaise: session.amount_paise,
        currency: session.currency,
        method: session.method,
        utr: utr || null,
        completedAt: new Date().toISOString(),
        metadata: session.metadata || {},
      },
    });
  } catch (e) {
    console.error('[webhook] delivery failed:', e.message);
  }

  res.json({ status: 'SUCCESS', utr: utr || null });
});

// Start verification window (customer clicked "Payment Done")
router.post('/:id/processing', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'session not active' });
  assertTransition('ACTIVE', 'PROCESSING');
  const procExpires = new Date(Date.now() + 30 * 1000).toISOString();
  await supabase.from('payment_sessions').update({ status: 'PROCESSING', processing_expires_at: procExpires }).eq('id', session.id);
  res.json({ status: 'PROCESSING', processingExpiresAt: procExpires });
});

// Cancel
router.post('/:id/cancel', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).eq('merchant_id', req.merchant.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  assertTransition(session.status, 'CANCELLED');
  await supabase.from('payment_sessions').update({ status: 'CANCELLED' }).eq('id', session.id);
  if (session.receiving_account_id) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
  }
  res.json({ status: 'CANCELLED' });
});

export default router;
