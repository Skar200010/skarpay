import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

let client = null;
let ready = false;
let currentQR = null;
let qrDataUrl = null;

export function initWhatsApp() {
  if (process.env.DISABLE_WHATSAPP === 'true') {
    console.log('[whatsapp] disabled by DISABLE_WHATSAPP=true');
    return null;
  }
  if (client) return client;
  
  try {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    });

  client.on('qr', async (qr) => {
    currentQR = qr;
    ready = false;
    try {
      qrDataUrl = await QRCode.toDataURL(qr);
    } catch (e) {
      console.error('QR gen error:', e);
    }
    console.log('\n=== WHATSAPP QR CODE ===');
    qrcode.generate(qr, { small: true });
    console.log('Scan this QR code with your WhatsApp app\n');
  });

  client.on('ready', () => {
    ready = true;
    currentQR = null;
    qrDataUrl = null;
    console.log('✅ WhatsApp connected and ready to send OTPs');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp auth failed:', msg);
    ready = false;
  });

  client.on('disconnected', (reason) => {
    ready = false;
    currentQR = null;
    qrDataUrl = null;
    console.log('⚠️ WhatsApp disconnected:', reason);
    client = null;
  });

    client.initialize();
    return client;
  } catch (e) {
    console.log('[whatsapp] init failed, skipping:', e.message);
    client = null;
    ready = false;
    return null;
  }
}

export function getWhatsAppStatus() {
  return {
    ready,
    hasQR: !!qrDataUrl,
    qr: qrDataUrl
  };
}

export async function logoutWhatsApp() {
  if (client) {
    try {
      await client.logout();
    } catch (e) {}
    try {
      await client.destroy();
    } catch (e) {}
  }
  client = null;
  ready = false;
  currentQR = null;
  qrDataUrl = null;
}

export async function sendWhatsAppOTP(mobile, otp) {
  if (!client || !ready) {
    throw new Error('WhatsApp not ready. Scan QR code first.');
  }
  
  // Add country code if not present (assuming India +91)
  let number = mobile.replace(/\D/g, '');
  if (number.length === 10) number = '91' + number;
  if (!number.endsWith('@c.us')) number = number + '@c.us';
  
  const message = `Your SkarPay verification code is: *${otp}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
  
  await client.sendMessage(number, message);
  return { success: true };
}

export function isWhatsAppReady() {
  return ready;
}

export async function sendOtp(mobile, otp) {
  try {
    if (ready) {
      await sendWhatsAppOTP(mobile, otp);
      return { sent: true, method: 'whatsapp' };
    }
    console.log(`[OTP] ${mobile}: ${otp} (purpose: customer)`);
    return { sent: false, method: 'console', otp };
  } catch (e) {
    console.log(`[OTP] ${mobile}: ${otp} (purpose: customer)`);
    return { sent: false, method: 'console', otp, error: e.message };
  }
}
