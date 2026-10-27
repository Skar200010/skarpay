import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initSupabase, getAdmin } from '../../../packages/db/src/supabase.js';
import merchantRoutes from './routes/merchants.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import observerRoutes from './routes/observers.routes.js';
import adminRoutes from './routes/admin.routes.js';
import customerRoutes from './routes/customers.routes.js';
import { startSweeper } from './services/sweeper.js';
import { startWebhookRetry } from './services/webhook-retry.js';
import { initWhatsApp } from './services/whatsapp.service.js';

initSupabase({
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anonKey: process.env.SUPABASE_ANON_KEY,
});

const app = express();
const PORT = process.env.API_PORT || 4100;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'skarpay-api', supabase: !!getAdmin(), ts: new Date().toISOString() });
});

app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/observers', observerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/customers', customerRoutes);

app.use((err, req, res, next) => {
  console.error('[api] error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, () => {
  console.log(`[skarpay-api] listening on :${PORT}`);
  startSweeper();
  console.log('[sweeper] started');
  startWebhookRetry();
  console.log('[webhook-retry] started');
  initWhatsApp();
});

export default app;
