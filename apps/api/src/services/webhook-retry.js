import { requireAdmin } from '../../../../packages/db/src/supabase.js';
import { deliverWebhook } from './webhook.service.js';

// Retry failed webhook deliveries with exponential backoff.
export function startWebhookRetry() {
  setInterval(async () => {
    const supabase = requireAdmin();
    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .lte('next_retry_at', now)
      .lt('attempts', 5);

    for (const d of pending || []) {
      const { data: session } = await supabase.from('payment_sessions').select('*').eq('id', d.payment_session_id).single();
      if (!session) continue;
      const { data: merchant } = await supabase.from('merchants').select('*').eq('id', session.merchant_id).single();
      if (!merchant?.webhook_url) continue;

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
            utr: session.utr,
            completedAt: session.updated_at,
            metadata: session.metadata || {},
          },
        });
        await supabase.from('webhook_deliveries').update({ status: 'DELIVERED', attempts: d.attempts + 1 }).eq('id', d.id);
      } catch (e) {
        const nextRetry = new Date(Date.now() + Math.pow(2, d.attempts) * 10000).toISOString();
        await supabase.from('webhook_deliveries').update({
          status: 'FAILED',
          attempts: d.attempts + 1,
          last_error: e.message,
          next_retry_at: nextRetry,
        }).eq('id', d.id);
      }
    }
  }, 15000);
}
