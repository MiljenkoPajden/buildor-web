/**
 * Local dev API server — serves /api/* endpoints for local development.
 * Vite (port 3027) proxies /api/* to this server (port 3028).
 *
 * Usage (two terminals):
 *   Terminal 1: npm run dev:api    ← starts this server
 *   Terminal 2: npm run dev        ← starts Vite
 *
 * Then open: http://localhost:3027/checkout
 * Env vars loaded via: node --env-file=.env (Node 20.6+)
 */

import express from 'express';
import createOrderHandler from './api/paypal/create-order.js';
import captureOrderHandler from './api/paypal/capture-order.js';

const app = express();
app.use(express.json());

// PayPal endpoints
app.post('/api/paypal/create-order', (req, res) => createOrderHandler(req, res));
app.post('/api/paypal/capture-order', (req, res) => captureOrderHandler(req, res));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, env: !!process.env.VITE_SUPABASE_URL }));

const PORT = 3028;
app.listen(PORT, () => {
  const supaOk = !!process.env.VITE_SUPABASE_URL;
  console.log('\n✅ API server: http://localhost:' + PORT);
  console.log('   Supabase env: ' + (supaOk ? '✅ loaded' : '❌ missing — check .env'));
  console.log('\n   Now run: npm run dev');
  console.log('   Then open: http://localhost:3027/checkout\n');
});
