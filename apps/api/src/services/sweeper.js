import { requireAdmin } from '../../../packages/db/src/supabase.js';

// Background sweeper: expire timed-out sessions, promote queued customers.
export function startSweeper() {
  setInterval(async () => {
    const supabase = requireAdmin();
    const now = new Date().toISOString();

    // Expire ACTIVE sessions past expires_at
    const { data: expired } = await supabase
      .from('payment_sessions')
      .select('id, receiving_account_id')
      .eq('status', 'ACTIVE')
      .lt('expires_at', now);

    for (const s of expired || []) {
      await supabase.from('payment_sessions').update({ status: 'EXPIRED' }).eq('id', s.id);
      if (s.receiving_account_id) {
        // promote next queued
        await promoteNext(s.receiving_account_id);
      }
    }

    // Expire PROCESSING sessions past processing_expires_at
    const { data: procExpired } = await supabase
      .from('payment_sessions')
      .select('id, receiving_account_id')
      .eq('status', 'PROCESSING')
      .lt('processing_expires_at', now);

    for (const s of procExpired || []) {
      await supabase.from('payment_sessions').update({ status: 'FAILED' }).eq('id', s.id);
      if (s.receiving_account_id) {
        await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', s.receiving_account_id);
        await promoteNext(s.receiving_account_id);
      }
    }
  }, 5000);
}

async function promoteNext(accountId) {
  const supabase = requireAdmin();
  // find lowest queue_position QUEUED session
  const { data: next } = await supabase
    .from('payment_sessions')
    .select('id')
    .eq('receiving_account_id', accountId)
    .eq('status', 'QUEUED')
    .order('queue_position', { ascending: true })
    .limit(1)
    .single();

  if (!next) {
    await supabase.from('receiving_accounts').update({ is_slot_busy: false }).eq('id', accountId);
    return;
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await supabase.from('payment_sessions').update({
    status: 'ACTIVE',
    activated_at: new Date().toISOString(),
    expires_at: expiresAt,
    queue_position: null,
  }).eq('id', next.id);
  await supabase.from('receiving_accounts').update({ is_slot_busy: true }).eq('id', accountId);
}
