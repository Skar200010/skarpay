-- SkarPay initial schema (Postgres / Supabase)
-- Ported from YOUPI PG V2 SQLite schema.

create extension if not exists "uuid-ossp";

-- Merchants
create table if not exists merchants (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  api_key_hash text not null unique,
  webhook_secret text not null,
  webhook_url text,
  branding jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Receiving accounts (VPAs)
create table if not exists receiving_accounts (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  vpa text not null,
  account_name text,
  is_slot_busy boolean default false,
  daily_limit_paise bigint default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customers
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  mobile_number text not null unique,
  name text,
  email text,
  risk_tier text default 'standard',
  is_banned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customer sessions
create table if not exists customer_sessions (
  token text primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  expires_at timestamptz not null,
  user_agent text,
  ip_address text,
  created_at timestamptz default now()
);

-- Payment sessions
create table if not exists payment_sessions (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  receiving_account_id uuid references receiving_accounts(id) on delete set null,
  order_id text not null,
  amount_paise bigint not null,
  currency text default 'INR',
  method text default 'UPI',
  status text not null default 'INITIATED',
  queue_position int,
  expires_at timestamptz,
  activated_at timestamptz,
  processing_expires_at timestamptz,
  utr text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payment_sessions_merchant on payment_sessions(merchant_id);
create index if not exists idx_payment_sessions_status on payment_sessions(status);
create index if not exists idx_payment_sessions_order on payment_sessions(merchant_id, order_id);

-- Observations
create table if not exists observations (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid references merchants(id) on delete cascade,
  source text not null,
  raw_text text,
  parsed_amount_paise bigint,
  parsed_utr text,
  receiving_account_id uuid references receiving_accounts(id) on delete set null,
  cluster_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_observations_cluster on observations(cluster_hash);

-- Devices (Android observers)
create table if not exists devices (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid references merchants(id) on delete cascade,
  device_name text,
  device_model text,
  signing_key_hash text,
  is_active boolean default true,
  last_heartbeat_at timestamptz,
  created_at timestamptz default now()
);

-- Webhook deliveries
create table if not exists webhook_deliveries (
  id uuid primary key default uuid_generate_v4(),
  payment_session_id uuid not null references payment_sessions(id) on delete cascade,
  delivery_id uuid not null unique,
  status text default 'PENDING',
  attempts int default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Audit logs
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references payment_sessions(id) on delete cascade,
  event_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS: enable on all tables
alter table merchants enable row level security;
alter table receiving_accounts enable row level security;
alter table customers enable row level security;
alter table customer_sessions enable row level security;
alter table payment_sessions enable row level security;
alter table observations enable row level security;
alter table devices enable row level security;
alter table webhook_deliveries enable row level security;
alter table audit_logs enable row level security;

-- RLS policies: merchants own their data via auth.uid() matching merchant owner.
-- For simplicity, merchant rows are scoped by an owner_id column added below.
alter table merchants add column if not exists owner_id uuid references auth.users(id);

-- Merchants: owner can read/update own merchant
create policy "merchants_owner_select" on merchants for select
  using (owner_id = auth.uid());
create policy "merchants_owner_update" on merchants for update
  using (owner_id = auth.uid());

-- Child tables: scoped via merchant_id -> merchants.owner_id
create policy "receiving_accounts_owner" on receiving_accounts for all
  using (merchant_id in (select id from merchants where owner_id = auth.uid()))
  with check (merchant_id in (select id from merchants where owner_id = auth.uid()));

create policy "payment_sessions_owner" on payment_sessions for all
  using (merchant_id in (select id from merchants where owner_id = auth.uid()))
  with check (merchant_id in (select id from merchants where owner_id = auth.uid()));

create policy "observations_owner" on observations for all
  using (merchant_id in (select id from merchants where owner_id = auth.uid()))
  with check (merchant_id in (select id from merchants where owner_id = auth.uid()));

create policy "devices_owner" on devices for all
  using (merchant_id in (select id from merchants where owner_id = auth.uid()))
  with check (merchant_id in (select id from merchants where owner_id = auth.uid()));

create policy "webhook_deliveries_owner" on webhook_deliveries for all
  using (payment_session_id in (select id from payment_sessions where merchant_id in (select id from merchants where owner_id = auth.uid())));

create policy "audit_logs_owner" on audit_logs for all
  using (session_id in (select id from payment_sessions where merchant_id in (select id from merchants where owner_id = auth.uid())));
