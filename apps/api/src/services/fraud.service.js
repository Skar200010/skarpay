import { requireAdmin } from '../../../../../packages/db/src/supabase.js';

// Check if a customer is banned.
export async function isBanned(mobileNumber) {
  if (!mobileNumber) return false;
  const supabase = requireAdmin();
  const { data } = await supabase.from('customers').select('is_banned').eq('mobile_number', mobileNumber).single();
  return data?.is_banned === true;
}

// Ban a customer.
export async function banCustomer(mobileNumber, reason) {
  const supabase = requireAdmin();
  await supabase.from('customers').update({ is_banned: true, risk_tier: 'banned' }).eq('mobile_number', mobileNumber);
  return { banned: true, reason };
}
