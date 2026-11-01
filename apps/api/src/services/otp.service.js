import crypto from 'node:crypto';
import { sendWhatsAppOTP, isWhatsAppReady } from './whatsapp.service.js';

const otps = new Map(); // In-memory for now, use Redis in production

export function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendOTP(mobile, purpose = 'register') {
  const otp = generateOTP();
  const key = `${purpose}:${mobile}`;
  otps.set(key, {
    otp,
    expires: Date.now() + 5 * 60 * 1000, // 5 min
    attempts: 0
  });
  
  const forceFixed = process.env.FORCE_FIXED_WHATSAPP_OTP === 'true';
  const fixedNumber = process.env.WHATSAPP_FIXED_OTP_NUMBER || '7045878466';
  const targetNumber = forceFixed ? fixedNumber : mobile;
  
  try {
    if (isWhatsAppReady()) {
      await sendWhatsAppOTP(targetNumber, otp);
      console.log(`[OTP] Sent via WhatsApp to ${targetNumber} (for merchant ${mobile}) - OTP: ${otp}`);
      return { success: true, message: 'OTP sent on WhatsApp' };
    }
  } catch (e) {
    console.error('[OTP] WhatsApp failed:', e.message);
  }
  
  console.log(`[OTP] ${targetNumber}: ${otp} (purpose: ${purpose}, for: ${mobile})`);
  return { success: true, message: 'OTP sent' };
}

export function verifyOTP(mobile, otp, purpose = 'register') {
  const key = `${purpose}:${mobile}`;
  const record = otps.get(key);
  if (!record) return { success: false, error: 'OTP not found or expired' };
  if (Date.now() > record.expires) {
    otps.delete(key);
    return { success: false, error: 'OTP expired' };
  }
  if (record.attempts >= 3) {
    otps.delete(key);
    return { success: false, error: 'Too many attempts' };
  }
  record.attempts++;
  if (record.otp !== otp) {
    return { success: false, error: 'Invalid OTP' };
  }
  otps.delete(key);
  return { success: true };
}
