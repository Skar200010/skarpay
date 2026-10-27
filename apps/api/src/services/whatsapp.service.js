import { requireAdmin } from '../../../../packages/db/src/supabase.js';

let sock = null;
let isConnected = false;

// Lazy import baileys
async function loadBaileys() {
  try {
    const mod = await import('baileys');
    return mod;
  } catch (e) {
    console.warn('[whatsapp] baileys not installed:', e.message);
    return null;
  }
}

export async function initWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('[whatsapp] disabled (set WHATSAPP_ENABLED=true to enable)');
    return;
  }
  const baileys = await loadBaileys();
  if (!baileys) return;

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
  const { state, saveCreds } = await useMultiFileAuthState('./data/whatsapp-auth');

  sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[whatsapp] connection closed, reconnect:', shouldReconnect);
      if (shouldReconnect) initWhatsApp();
    } else if (connection === 'open') {
      isConnected = true;
      console.log('[whatsapp] connected');
    }
  });
}

export async function sendOtp(mobile, otp) {
  if (!sock || !isConnected) {
    console.log(`[whatsapp] not connected; OTP for ${mobile}: ${otp} (fallback)`);
    return { sent: false, fallback: true, otp };
  }
  try {
    const jid = mobile.replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: `Your SkarPay verification code is: ${otp}. Valid for 5 minutes.` });
    return { sent: true };
  } catch (e) {
    console.error('[whatsapp] send failed:', e.message);
    return { sent: false, error: e.message };
  }
}

export function isWhatsAppConnected() {
  return isConnected;
}
