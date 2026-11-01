import express from 'express';
import { getWhatsAppStatus, initWhatsApp, logoutWhatsApp } from '../services/whatsapp.service.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/status', adminAuth, (req, res) => {
  res.json(getWhatsAppStatus());
});

router.post('/init', adminAuth, (req, res) => {
  try {
    initWhatsApp();
    res.json({ message: 'Initializing...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', adminAuth, async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ message: 'Logged out' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
