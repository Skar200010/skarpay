import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { generateHmac, verifyHmac } from '../../../../packages/shared/src/crypto.js';
import { normalizeObservation } from '../services/normalizer.js';
import { assertTransition } from '../services/state-machine.js';
import { deliverWebhook } from '../services/webhook.service.js';

const router = express.Router();

// POST /api/v1/observers/sms  (Android / SMS observer)
router.post('/sms', async (req, res) => {
  const supabase = requireAdmin();
  const { source, rawText, receivingAccountId, signature, timestamp } = req.body || {};
  if (!rawText) return res.status(400).json({ error: 'rawText required' });

  // Optional HMAC verification if deviceSecret provided
  // (MVP: accept unsigned for testing; production should enforce.)

  const parsed = normalizeObservation(rawText);
  if (!parsed.amountPaise) return res.status(400).json({ error: 'could not parse amount' });

  // Find receiving account
  let account = null;
  if (receivingAccountId) {
    const { data } = await supabase.from('receiving_accounts').select('*').eq('id', receivingAccountId).single();
    account = data;
  }

  // Store observation
  const clusterHash = crypto.createHash('sha256').update(`${account?.id || ''}:${parsed.amountPaise}:${parsed.utr || ''}`).digest('hex');
  await supabase.from('observations').insert({
    merchant_id: account?.merchant_id || null,
    source: source || 'SMS',
    raw_text: rawText,
    parsed_amount_paise: parsed.amountPaise,
    parsed_utr: parsed.utr,
    receiving_account_id: account?.id || null,
    cluster_hash: clusterHash,
  });

  // Match to active session
  // If no specific account, search across all active sessions with matching amount
  let sessionQuery = supabase
    .from('payment_sessions')
    .select('*')
    .eq('amount_paise', parsed.amountPaise)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true })
    .limit(1);

  if (account) {
    sessionQuery = sessionQuery.eq('receiving_account_id', account.id);
  }

  const { data: session } = await sessionQuery.single();

  if (session) {
      assertTransition('ACTIVE', 'SUCCESS');
      await supabase.from('payment_sessions').update({ status: 'SUCCESS', utr: parsed.utr }).eq('id', session.id);
      if (account) await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', account.id);
      await supabase.from('audit_logs').insert({ session_id: session.id, event_type: 'OBSERVER_MATCH', details: { source, utr: parsed.utr, amount: parsed.amountPaise } });

      // webhook
      const { data: merchant } = await supabase.from('merchants').select('*').eq('id', session.merchant_id).single();
      if (merchant?.webhook_url) {
        try {
          await deliverWebhook({
            url: merchant.webhook_url,
            secret: merchant.webhook_secret,
            payload: {
              event: 'SUCCESS',
              paymentId: session.id,
              orderId: session.order_id,
              amount: (session.amount_paise / 100).toFixed(2),
              amountPaise: session.amount_paise,
              currency: session.currency,
              method: session.method,
              utr: parsed.utr,
              completedAt: new Date().toISOString(),
              metadata: session.metadata || {},
            },
          });
        } catch (e) { console.error('[webhook] failed:', e.message); }
      }

      return res.json({ matched: true, sessionId: session.id, status: 'SUCCESS' });
    }

  res.json({ matched: false, parsed });
});

// POST /api/v1/observers/gmail
router.post('/gmail', async (req, res) => {
  req.body.source = 'GMAIL';
  // delegate to sms handler logic by re-running
  const { rawText, receivingAccountId } = req.body || {};
  if (!rawText) return res.status(400).json({ error: 'rawText required' });
  // Reuse same matching by forwarding internally
  req.url = '/sms';
  // Just duplicate minimal: call the same logic
  const supabase = requireAdmin();
  const parsed = normalizeObservation(rawText);
  if (!parsed.amountPaise) return res.status(400).json({ error: 'could not parse amount' });
  let account = null;
  if (receivingAccountId) {
    const { data } = await supabase.from('receiving_accounts').select('*').eq('id', receivingAccountId).single();
    account = data;
  }
  const clusterHash = crypto.createHash('sha256').update(`${account?.id || ''}:${parsed.amountPaise}:${parsed.utr || ''}`).digest('hex');
  await supabase.from('observations').insert({
    merchant_id: account?.merchant_id || null,
    source: 'GMAIL',
    raw_text: rawText,
    parsed_amount_paise: parsed.amountPaise,
    parsed_utr: parsed.utr,
    receiving_account_id: account?.id || null,
    cluster_hash: clusterHash,
  });
  if (account) {
    let sq = supabase.from('payment_sessions').select('*').eq('amount_paise', parsed.amountPaise).eq('status', 'ACTIVE').order('created_at', { ascending: true }).limit(1);
    if (account) sq = sq.eq('receiving_account_id', account.id);
    const { data: session } = await sq.single();
    if (session) {
      assertTransition('ACTIVE', 'SUCCESS');
      await supabase.from('payment_sessions').update({ status: 'SUCCESS', utr: parsed.utr }).eq('id', session.id);
      if (account) await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', account.id);
      await supabase.from('audit_logs').insert({ session_id: session.id, event_type: 'OBSERVER_MATCH', details: { source: 'GMAIL', utr: parsed.utr } });
      return res.json({ matched: true, sessionId: session.id, status: 'SUCCESS' });
    }
  }
  res.json({ matched: false, parsed });
});

export default router;
