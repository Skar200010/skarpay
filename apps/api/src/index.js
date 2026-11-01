import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import { initSupabase, getAdmin } from '../../../packages/db/src/supabase.js';
import merchantRoutes from './routes/merchants.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import observerRoutes from './routes/observers.routes.js';
import adminRoutes from './routes/admin.routes.js';
import customerRoutes from './routes/customers.routes.js';
import pollersRoutes from './routes/pollers.routes.js';
import merchantAuthRoutes from './routes/merchant-auth.routes.js';
import merchantPanelRoutes from './routes/merchant-panel.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import { initWhatsApp } from './services/whatsapp.service.js';
import { startSweeper } from './services/sweeper.js';
import { startWebhookRetry } from './services/webhook-retry.js';

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  initSupabase({
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  });
} else {
  console.error('Missing Supabase env vars');
}

const app = express();
// Render/Railway inject PORT; local dev falls back to API_PORT/4100.
const PORT = process.env.PORT || process.env.API_PORT || 4100;
const HOST = process.env.API_HOST || '0.0.0.0';

app.use(helmet());

// CORS is open for local dev; set CORS_ORIGINS (comma-separated) in production
// to lock browser access to the admin/checkout domains.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
// Serve SDK
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/sdk', express.static(path.resolve(__dirname, '../../sdk')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'skarpay-api', supabase: !!getAdmin(), ts: new Date().toISOString() });
});

app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/merchant-auth', merchantAuthRoutes);
app.use('/api/v1/merchant-panel', merchantPanelRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/observers', observerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/pollers', pollersRoutes);

app.use((err, req, res, next) => {
  console.error('[api] error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, HOST, () => {
  console.log(`[skarpay-api] listening on ${HOST}:${PORT}`);
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      startSweeper();
      console.log('[sweeper] started');
    } catch (e) {
      console.log('[sweeper] skipped:', e.message);
    }
    try {
      startWebhookRetry();
      console.log('[webhook-retry] started');
    } catch (e) {
      console.log('[webhook-retry] skipped:', e.message);
    }
  } else {
    console.log('[warn] Skipping sweeper/webhook-retry - Missing Supabase env vars');
  }
  try {
    initWhatsApp();
  } catch (e) {
    console.log('[whatsapp] skipped:', e.message);
  }
});

export default app;
