import express from 'express';
import { getWhatsAppStatus, initWhatsApp, logoutWhatsApp } from '../services/whatsapp-baileys.service.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/status', adminAuth, (req, res) => {
  res.json(getWhatsAppStatus());
});

router.post('/init', adminAuth, async (req, res) => {
  try {
    await initWhatsApp();
    res.json({ ok: true, message: 'Initializing WhatsApp (Baileys)...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', adminAuth, async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ ok: true, message: 'Logged out' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
