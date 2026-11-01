-- Add merchant auth fields
alter table merchants 
  add column if not exists mobile text,
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists address text,
  add column if not exists gst text,
  add column if not exists status text default 'APPROVED',
  add column if not exists owner_id uuid;

-- Create merchant sessions table
create table if not exists merchant_sessions (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_merchant_sessions_token on merchant_sessions(token_hash);
create index if not exists idx_merchant_sessions_merchant on merchant_sessions(merchant_id);
