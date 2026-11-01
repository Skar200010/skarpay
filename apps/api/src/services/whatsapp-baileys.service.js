import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sock = null;
let ready = false;
let qrDataUrl = null;
let qrString = null;

const AUTH_DIR = path.join(process.cwd(), '.baileys_auth');

export async function initWhatsApp() {
  if (process.env.DISABLE_WHATSAPP === 'true') {
    console.log('[whatsapp-baileys] disabled by DISABLE_WHATSAPP=true');
    return null;
  }
  if (sock) return sock;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: ['SkarPay', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        qrString = qr;
        ready = false;
        try {
          qrDataUrl = await QRCode.toDataURL(qr);
        } catch (e) {
          console.error('[whatsapp-baileys] QR gen error:', e);
        }
        console.log('\n=== WHATSAPP QR CODE (BAILEYS) ===');
        console.log('Scan this QR code with your WhatsApp app\n');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log('[whatsapp-baileys] connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        ready = false;
        qrDataUrl = null;
        qrString = null;
        sock = null;
        if (shouldReconnect) {
          setTimeout(() => initWhatsApp(), 3000);
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected and ready to send OTPs (Baileys)');
        ready = true;
        qrDataUrl = null;
        qrString = null;
      }
    });

    return sock;
  } catch (e) {
    console.log('[whatsapp-baileys] init failed, skipping:', e.message);
    sock = null;
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
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {}
    sock = null;
  }
  ready = false;
  qrDataUrl = null;
  qrString = null;
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {}
}

export async function sendWhatsAppOTP(mobile, otp) {
  if (!sock || !ready) {
    throw new Error('WhatsApp not ready. Scan QR code first.');
  }
  
  let number = mobile.replace(/\D/g, '');
  if (number.length === 10) number = '91' + number;
  const jid = number + '@s.whatsapp.net';
  
  const message = `Your SkarPay verification code is: *${otp}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
  
  await sock.sendMessage(jid, { text: message });
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
