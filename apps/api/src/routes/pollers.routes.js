import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateRandomToken } from '../../../../packages/shared/src/crypto.js';

const router = express.Router();

// Device pairing
router.post('/android/pair', async (req, res) => {
  const supabase = requireAdmin();
  const { enrollmentToken, deviceName, merchantId } = req.body || {};
  // For MVP, accept any enrollment token and create a device
  const deviceSecret = generateRandomToken(32);
  const secretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');

  // Validate the requested merchant and fall back to the first merchant so a
  // stale merchant id from a previous pairing can never fail the FK insert.
  let mid = null;
  if (merchantId) {
    const { data: merchant } = await supabase.from('merchants').select('id').eq('id', merchantId).single();
    mid = merchant?.id || null;
  }
  if (!mid) {
    const { data: first } = await supabase.from('merchants').select('id').limit(1).single();
    mid = first?.id || null;
  }
  if (!mid) return res.status(400).json({ error: 'no merchant available to pair with' });

  const { data, error } = await supabase.from('devices').insert({
    merchant_id: mid,
    device_name: deviceName || 'Android Observer',
    device_model: 'Android',
    signing_key_hash: secretHash,
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
router.get('/android/events', async (req, res) => {
  const supabase = requireAdmin();
  const { data: sessions } = await supabase.from('payment_sessions').select('id, amount_paise, status, expires_at').eq('status', 'ACTIVE').limit(5);
  res.json({ events: sessions || [] });
});

export default router;
