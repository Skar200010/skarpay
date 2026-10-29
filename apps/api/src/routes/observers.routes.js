import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { verifyHmac } from '../../../../packages/shared/src/crypto.js';
import { normalizeObservation } from '../services/normalizer.js';
import { assertTransition } from '../services/state-machine.js';
import { deliverWebhook } from '../services/webhook.service.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

// POST /api/v1/observers/sms  (Android / SMS observer)
router.post('/sms', async (req, res) => {
  const supabase = requireAdmin();
  const body = req.body || {};
  const { source, rawText, receivingAccountId } = body;
  const signature = body.signature || req.headers['x-device-signature'];
  const timestamp = body.timestamp ?? req.headers['x-device-timestamp'];
  const deviceId = body.deviceId || req.headers['x-device-id'];
  const bodyMerchantId = body.merchantId || null;
  if (!rawText) return res.status(400).json({ error: 'rawText required' });

  const requireSigned = process.env.REQUIRE_SIGNED_OBSERVERS !== 'false';

  // Devices are identified by the id returned at pairing. The HMAC secret is
  // stored server-side so a forged SMS cannot mark a payment as SUCCESS.
  let device = null;
  if (deviceId) {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .eq('is_active', true)
      .single();
    device = data;
  }

  if (requireSigned) {
    if (!device) return res.status(401).json({ error: 'Unknown or inactive device' });
    if (!device.signing_key) return res.status(401).json({ error: 'Device must be re-paired' });
    if (!signature || timestamp === undefined || timestamp === null) {
      return res.status(401).json({ error: 'Missing device signature' });
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGNATURE_MAX_AGE_MS) {
      return res.status(401).json({ error: 'Stale or invalid timestamp' });
    }
    if (!verifyHmac(`${rawText}:${timestamp}`, device.signing_key, String(signature))) {
      return res.status(401).json({ error: 'Invalid device signature' });
    }
  }

  if (device && bodyMerchantId && device.merchant_id && String(bodyMerchantId) !== String(device.merchant_id)) {
    return res.status(403).json({ error: 'Device/merchant mismatch' });
  }

  const parsed = normalizeObservation(rawText);
  if (!parsed.amountPaise) return res.status(400).json({ error: 'could not parse amount' });

  // Find receiving account
  let account = null;
  if (receivingAccountId) {
    const { data } = await supabase.from('receiving_accounts').select('*').eq('id', receivingAccountId).single();
    account = data;
  }
  if (device?.merchant_id && account?.merchant_id && String(account.merchant_id) !== String(device.merchant_id)) {
    return res.status(403).json({ error: 'Account/device mismatch' });
  }

  const scopeMerchantId = device?.merchant_id || bodyMerchantId || null;
  const effectiveMerchantId = account?.merchant_id || scopeMerchantId || null;
  console.log(
    `[observer] ${source || 'SMS'} amount=${parsed.amountPaise} utr=${parsed.utr || '-'} merchant=${effectiveMerchantId || '-'} raw="${String(rawText).replace(/\s+/g, ' ').slice(0, 90)}"`,
  );

  // Store observation
  const clusterHash = crypto.createHash('sha256').update(`${account?.id || ''}:${parsed.amountPaise}:${parsed.utr || ''}`).digest('hex');
  await supabase.from('observations').insert({
    merchant_id: effectiveMerchantId,
    source: source || 'SMS',
    raw_text: rawText,
    parsed_amount_paise: parsed.amountPaise,
    parsed_utr: parsed.utr,
    receiving_account_id: account?.id || null,
    cluster_hash: clusterHash,
  });

  // Match to active session
  // If no specific account, search across all active sessions with matching amount.
  const baseQuery = () => {
    let q = supabase
      .from('payment_sessions')
      .select('*')
      .eq('amount_paise', parsed.amountPaise)
      .in('status', ['ACTIVE', 'PROCESSING', 'QUEUED'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (account) q = q.eq('receiving_account_id', account.id);
    return q;
  };

  // Prefer a merchant-scoped match when the account is unknown, then fall back
  // to any merchant so a mis-scoped pairing never blocks a valid payment.
  let session = null;
  if (account || !scopeMerchantId) {
    session = (await baseQuery().single()).data;
  } else {
    session = (await baseQuery().eq('merchant_id', scopeMerchantId).single()).data;
    if (!session) session = (await baseQuery().single()).data;
  }

  if (session) {
      console.log(`[observer] matched session ${session.id} amount=${session.amount_paise} status=${session.status} -> SUCCESS`);
      assertTransition(session.status === 'QUEUED' ? 'ACTIVE' : session.status, 'SUCCESS');
      await supabase.from('payment_sessions').update({ status: 'SUCCESS', utr: parsed.utr }).eq('id', session.id);
      if (session.receiving_account_id) await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
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

  console.log(`[observer] no matching session for amount=${parsed.amountPaise} merchant=${effectiveMerchantId || '-'}`);
  res.json({ matched: false, parsed });
});

// POST /api/v1/observers/gmail (admin-only; no public ingestion yet)
router.post('/gmail', adminAuth, async (req, res) => {
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
    let sq = supabase.from('payment_sessions').select('*').eq('amount_paise', parsed.amountPaise).in('status', ['ACTIVE', 'PROCESSING', 'QUEUED']).order('created_at', { ascending: false }).limit(1);
    if (account) sq = sq.eq('receiving_account_id', account.id);
    const { data: session } = await sq.single();
    if (session) {
      console.log(`[observer] matched session ${session.id} amount=${session.amount_paise} status=${session.status} -> SUCCESS`);
      assertTransition(session.status === 'QUEUED' ? 'ACTIVE' : session.status, 'SUCCESS');
      await supabase.from('payment_sessions').update({ status: 'SUCCESS', utr: parsed.utr }).eq('id', session.id);
      if (session.receiving_account_id) await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', session.receiving_account_id);
      await supabase.from('audit_logs').insert({ session_id: session.id, event_type: 'OBSERVER_MATCH', details: { source: 'GMAIL', utr: parsed.utr } });
      return res.json({ matched: true, sessionId: session.id, status: 'SUCCESS' });
    }
  }
  res.json({ matched: false, parsed });
});

export default router;
