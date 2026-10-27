import express from 'express';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { assertTransition } from '../services/state-machine.js';

const router = express.Router();

// List pending counter payments for cashier
router.get('/counter-pending', async (req, res) => {
  const supabase = requireAdmin();
  const merchantId = req.query.merchant_id;
  let q = supabase.from('payment_sessions').select('*').eq('status', 'ACTIVE').in('method', ['CASH_COUNTER', 'CARD_COUNTER']);
  if (merchantId) q = q.eq('merchant_id', merchantId);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sessions: data || [] });
});

// Approve counter payment
router.post('/counter-approve/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  assertTransition(session.status, 'SUCCESS');
  await supabase.from('payment_sessions').update({ status: 'SUCCESS' }).eq('id', session.id);
  if (session.receiving_account_id) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
  }
  res.json({ status: 'SUCCESS' });
});

// Decline counter payment
router.post('/counter-decline/:id', async (req, res) => {
  const supabase = requireAdmin();
  const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', req.params.id).single();
  if (!session) return res.status(404).json({ error: 'not found' });
  assertTransition(session.status, 'CANCELLED');
  await supabase.from('payment_sessions').update({ status: 'CANCELLED' }).eq('id', session.id);
  if (session.receiving_account_id) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
  }
  res.json({ status: 'CANCELLED' });
});

export default router;
