// Vercel serverless function — POST /api/paypal/create-order
// Creates a PayPal order and returns the order ID to the frontend.
// Credentials are read from Supabase app_config (single source of truth).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

/** Fetch PayPal credentials from Supabase app_config table */
async function getPayPalConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_config?key=in.(paypal_client_id,paypal_client_secret,paypal_mode)&select=key,value`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const cfg = {};
  for (const row of rows) cfg[row.key] = row.value;
  return cfg;
}

/** Get PayPal OAuth token */
async function getAccessToken(clientId, clientSecret, sandbox) {
  const base = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal auth failed');
  const data = await res.json();
  return { token: data.access_token, base };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = await getPayPalConfig();
    if (!cfg?.paypal_client_id || !cfg?.paypal_client_secret) {
      return res.status(503).json({ error: 'PayPal not configured' });
    }

    const sandbox = cfg.paypal_mode !== 'live';
    const { token, base } = await getAccessToken(cfg.paypal_client_id, cfg.paypal_client_secret, sandbox);

    const { amount = '2.00', currency = 'USD' } = req.body || {};

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount,
            },
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.text();
      return res.status(502).json({ error: 'PayPal order creation failed', detail: errBody });
    }

    const order = await orderRes.json();
    return res.status(200).json({ id: order.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
