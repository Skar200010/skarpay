import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { sendOtp } from '../services/whatsapp.service.js';

const router = express.Router();

// Request OTP (MVP: generates 6-digit, stores, returns in response for testing)
router.post('/request-otp', async (req, res) => {
  const { mobile, name, email } = req.body || {};
  if (!mobile) return res.status(400).json({ error: 'mobile required' });
  const supabase = requireAdmin();

  // upsert customer
  let customerId = null;
  const { data: existing } = await supabase.from('customers').select('id').eq('mobile_number', mobile).single();
  if (existing) customerId = existing.id;
  else {
    const { data: created } = await supabase.from('customers').insert({ mobile_number: mobile, name: name || null, email: email || null }).select('id').single();
    customerId = created?.id;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase.from('customer_sessions').insert({
    token: `otp_${token}`,
    customer_id: customerId,
    expires_at: expiresAt,
    user_agent: 'otp-pending',
  });

  // Store OTP in audit log (MVP only; production uses WhatsApp)
  await supabase.from('audit_logs').insert({ session_id: null, event_type: 'OTP_ISSUED', details: { mobile, otp } });

  // Send via WhatsApp (Baileys) if enabled, else return otp for testing.
  const result = await sendOtp(mobile, otp);
  res.json({ message: 'OTP issued', otp: result.sent ? undefined : otp, expiresIn: 300, whatsapp: result });
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body || {};
  if (!mobile || !otp) return res.status(400).json({ error: 'mobile and otp required' });
  const supabase = requireAdmin();

  // Find latest OTP issued for this mobile
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('details, created_at')
    .eq('event_type', 'OTP_ISSUED')
    .order('created_at', { ascending: false })
    .limit(5);

  const match = (logs || []).find(l => l.details?.mobile === mobile && l.details?.otp === otp);
  if (!match) return res.status(400).json({ error: 'invalid otp' });

  // Issue customer session token
  const { data: customer } = await supabase.from('customers').select('id').eq('mobile_number', mobile).single();
  const token = 'csess_' + crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('customer_sessions').insert({
    token,
    customer_id: customer.id,
    expires_at: expiresAt,
  });

  res.json({ token, customerId: customer.id, expiresAt });
});

export default router;
