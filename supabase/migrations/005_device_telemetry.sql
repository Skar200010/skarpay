-- Hardware fleet data for the merchant panel.
--
-- Adds richer device metadata, a flexible telemetry snapshot (hardware models
-- report different fields, so this stays jsonb instead of a wide table), a
-- command queue the observer app drains on heartbeat, and OTA releases.

alter table if exists devices
  add column if not exists device_type text,
  add column if not exists serial_number text,
  add column if not exists location_label text,
  add column if not exists firmware_version text,
  add column if not exists telemetry jsonb default '{}'::jsonb,
  add column if not exists telemetry_updated_at timestamptz;

create index if not exists idx_devices_merchant on devices(merchant_id);

-- Commands queued by the merchant panel (test chime, print slip, push amount,
-- lock screen, set volume). The observer app polls PENDING rows on heartbeat
-- and writes back status/result.
create table if not exists device_commands (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references devices(id) on delete cascade,
  merchant_id uuid references merchants(id) on delete cascade,
  command text not null,
  payload jsonb default '{}'::jsonb,
  status text not null default 'PENDING',
  result jsonb,
  created_at timestamptz default now(),
  delivered_at timestamptz,
  acked_at timestamptz
);

create index if not exists idx_device_commands_pending on device_commands(device_id, status, created_at);
create index if not exists idx_device_commands_merchant on device_commands(merchant_id, created_at desc);

-- Over-the-air firmware catalogue.
create table if not exists firmware_releases (
  id uuid primary key default uuid_generate_v4(),
  version text not null,
  channel text not null default 'stable',
  device_type text,
  notes text,
  size_bytes bigint,
  rollout_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists idx_firmware_releases_version on firmware_releases(version, channel);

-- Link a payment to the terminal that announced it, so per-device history is
-- possible. Existing rows stay NULL.
alter table if exists payment_sessions
  add column if not exists device_id uuid references devices(id) on delete set null;

create index if not exists idx_payment_sessions_device on payment_sessions(device_id, created_at desc);
