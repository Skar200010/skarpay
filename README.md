# SkarPay — Self-Hosted Sovereign UPI Payment Gateway

React + Node.js + Supabase clone of the YOUPI PG V2 gateway.

## Quick start
1. Copy `.env.example` to `.env` and fill Supabase keys.
2. Run Supabase migrations: `npm run db:migrate` (or apply `supabase/migrations/*.sql`).
3. Install: `npm install`
4. Dev: `npm run dev` (API :4100, admin :5173, checkout :5174)

## Ports
- API: 4100
- Admin (React): 5173 (dev) / 6001 (prod)
- Checkout (React): 5174 (dev) / 7000 (prod)
- SDK: served from checkout origin as /skarpay.js
