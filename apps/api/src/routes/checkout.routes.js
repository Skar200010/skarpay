import express from 'express';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateQrSvg } from '../services/qr.service.js';

const router = express.Router();

// Public checkout data + QR
router.get('/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session, error } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).single();
  if (error || !session) return res.status(404).json({ error: 'not found' });
  const { data: merchant } = await supabase.from('merchants').select('business_name,branding').eq('id', session.merchant_id).single();
  const { data: account } = await supabase.from('receiving_accounts').select('vpa,account_name').eq('id', session.receiving_account_id).single();

  let qr = null;
  try {
    qr = await generateQrSvg({
      payeeVpa: account.vpa,
      payeeName: merchant?.business_name || account.account_name || 'Merchant',
      amountPaise: BigInt(session.amount_paise),
      transactionRef: session.order_id,
    });
  } catch (e) {
    console.error('[checkout] qr gen failed:', e.message);
  }

  res.json({
    payment: {
      id: session.id,
      orderId: session.order_id,
      amountPaise: session.amount_paise,
      currency: session.currency,
      status: session.status,
      expiresAt: session.expires_at,
      method: session.method,
    },
    merchant: { name: merchant?.business_name, branding: merchant?.branding },
    account: { vpa: account?.vpa },
    qr,
  });
});

// Public: start verification window (customer clicked "I've Paid")
router.post('/:id/processing', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'session not active' });
  const { assertTransition } = await import('../services/state-machine.js');
  assertTransition('ACTIVE', 'PROCESSING');
  const procExpires = new Date(Date.now() + 30 * 1000).toISOString();
  await supabase.from('payment_sessions').update({ status: 'PROCESSING', processing_expires_at: procExpires }).eq('id', session.id);
  res.json({ status: 'PROCESSING', processingExpiresAt: procExpires });
});

// Public cancel
router.post('/:id/cancel', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  await supabase.from('payment_sessions').update({ status: 'CANCELLED' }).eq('id', session.id);
  if (session.receiving_account_id) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
  }
  res.json({ status: 'CANCELLED' });
});

export default router;
