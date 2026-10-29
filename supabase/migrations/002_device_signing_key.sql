-- Store the per-device HMAC secret so the API can verify observer payloads.
-- Existing devices must re-pair after this migration is applied.
alter table if exists devices
  add column if not exists signing_key text;
