-- Add claim tracking for atomic double-payment prevention
alter table payment_sessions 
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text;

create index if not exists idx_payment_sessions_claim on payment_sessions(status, amount_paise, created_at);
create index if not exists idx_payment_sessions_merchant_claim on payment_sessions(merchant_id, status, amount_paise, created_at);
