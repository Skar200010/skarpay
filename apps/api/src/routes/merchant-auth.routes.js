import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateRandomToken } from '../../../../packages/shared/src/crypto.js';
import { sendOTP, verifyOTP } from '../services/otp.service.js';
import { merchantAuth } from '../middleware/auth.js';

const router = express.Router();

// Send OTP for registration
router.post('/send-otp', async (req, res) => {
  const { mobile } = req.body || {};
  if (!mobile) return res.status(400).json({ error: 'mobile required' });
  try {
    const result = await sendOTP(mobile, 'register');
    res.json(result);
  } catch (e) {
    console.error('[send-otp] error:', e.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Register merchant
router.post('/register', async (req, res) => {
  const { business_name, mobile, email, password, otp, address, gst } = req.body || {};
  if (!business_name || !mobile || !password || !otp) {
    return res.status(400).json({ error: 'business_name, mobile, password, otp required' });
  }
  
  // Verify OTP
  const otpCheck = verifyOTP(mobile, otp, 'register');
  if (!otpCheck.success) return res.status(400).json({ error: otpCheck.error });
  
  const supabase = requireAdmin();
  
  // Check if mobile already registered
  const { data: existing } = await supabase.from('merchants').select('id').eq('mobile', mobile).single();
  if (existing) return res.status(400).json({ error: 'Mobile already registered' });
  
  const apiKey = 'mk_live_' + generateRandomToken(24);
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const webhookSecret = generateRandomToken(32);
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  
  const { data, error } = await supabase.from('merchants').insert({
    business_name,
    mobile,
    email: email || null,
    password_hash: passwordHash,
    address: address || null,
    gst: gst || null,
    api_key_hash: apiKeyHash,
    webhook_secret: webhookSecret,
    branding: {},
    status: 'PENDING', // Requires admin approval
    is_active: false,
  }).select('id,business_name,mobile,email,status,created_at').single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.status(201).json({
    message: 'Registration submitted. Awaiting admin approval.',
    merchant: data,
    credentials: { api_key: apiKey, webhook_secret: webhookSecret }
  });
});

// Login merchant
router.post('/login', async (req, res) => {
  const { mobile, password } = req.body || {};
  if (!mobile || !password) return res.status(400).json({ error: 'mobile and password required' });
  
  const supabase = requireAdmin();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id,business_name,mobile,email,status,is_active,password_hash,api_key_hash')
    .eq('mobile', mobile)
    .single();
  
  if (error || !merchant) return res.status(401).json({ error: 'Invalid credentials' });
  if (merchant.password_hash !== passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  if (merchant.status !== 'APPROVED' || !merchant.is_active) {
    return res.status(403).json({ error: 'Account pending approval or inactive' });
  }
  
  const token = generateRandomToken(32);
  await supabase.from('merchant_sessions').insert({
    merchant_id: merchant.id,
    token_hash: crypto.createHash('sha256').update(token).digest('hex'),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  res.json({ token, merchant: { id: merchant.id, business_name: merchant.business_name, mobile: merchant.mobile, email: merchant.email } });
});

// Get merchant profile
router.get('/me', merchantAuth, async (req, res) => {
  res.json({ merchant: req.merchant });
});

export default router;
