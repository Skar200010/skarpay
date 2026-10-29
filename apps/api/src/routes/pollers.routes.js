import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateRandomToken } from '../../../../packages/shared/src/crypto.js';
import { adminAuth } from '../middleware/auth.js';
import {
  createEnrollmentToken,
  verifyEnrollmentToken,
  ENROLLMENT_TOKEN_TTL_MS,
} from '../services/enrollment.js';

const router = express.Router();

// Issue a short-lived, signed pairing token. Only the admin console can call
// this, and the observer app must present the token to pair.
router.get('/enrollment-token', adminAuth, async (req, res) => {
  const merchantId = req.query.merchantId;
  if (!merchantId) return res.status(400).json({ error: 'merchantId required' });

  const supabase = requireAdmin();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .single();
  if (!merchant) return res.status(404).json({ error: 'merchant not found' });

  try {
    const token = createEnrollmentToken(merchantId);
    res.json({ token, expiresAt: Date.now() + ENROLLMENT_TOKEN_TTL_MS });
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});

// Device pairing
router.post('/android/pair', async (req, res) => {
  const supabase = requireAdmin();
  const { enrollmentToken, deviceName, merchantId } = req.body || {};
  const requireToken = process.env.REQUIRE_ENROLLMENT_TOKEN !== 'false';

  const enrollment = enrollmentToken ? verifyEnrollmentToken(enrollmentToken) : null;
  if (requireToken && !enrollment) {
    return res.status(401).json({ error: 'Invalid or expired enrollment token' });
  }

  const deviceSecret = generateRandomToken(32);
  const secretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');

  // The signed token is authoritative for the merchant. The body merchantId is
  // only honoured in explicit local-development mode.
  const requestedMerchantId = enrollment?.merchantId || (!requireToken ? merchantId : null);
  let mid = null;
  if (requestedMerchantId) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', requestedMerchantId)
      .single();
    mid = merchant?.id || null;
  }
  if (!mid && !requireToken) {
    const { data: first } = await supabase.from('merchants').select('id').limit(1).single();
    mid = first?.id || null;
  }
  if (!mid) return res.status(400).json({ error: 'invalid or missing merchant for pairing' });

  const { data, error } = await supabase.from('devices').insert({
    merchant_id: mid,
    device_name: deviceName || 'Android Observer',
    device_model: 'Android',
    signing_key_hash: secretHash,
    signing_key: deviceSecret,
    is_active: true,
    last_heartbeat_at: new Date().toISOString(),
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    paired: true,
    deviceId: data.id,
    deviceSecret: deviceSecret, // shown once
    merchantId: mid,
  });
});

// Heartbeat
router.post('/android/heartbeat', async (req, res) => {
  const supabase = requireAdmin();
  const { deviceId } = req.body || {};
  if (deviceId) {
    await supabase.from('devices').update({ last_heartbeat_at: new Date().toISOString() }).eq('id', deviceId);
  }
  res.json({ ok: true, ts: Date.now() });
});

// Events (active window)
router.get('/android/events', adminAuth, async (req, res) => {
  const supabase = requireAdmin();
  const { data: sessions } = await supabase.from('payment_sessions').select('id, amount_paise, status, expires_at').eq('status', 'ACTIVE').limit(5);
  res.json({ events: sessions || [] });
});

export default router;
