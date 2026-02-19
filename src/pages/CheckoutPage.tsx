/**
 * CheckoutPage — PayPal checkout using @paypal/react-paypal-js
 *
 * @features
 * - PayPal popup with card + PayPal account support
 * - Client ID loaded from Supabase app_config (set in Admin panel)
 * - No backend required — PayPal SDK handles order creation
 * - Success / Error / Loading / No-config states
 *
 * @tokens bg-dark, bg-panel, bg-elevated, text-primary, border-default
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { fetchAppConfig } from '../lib/supabase';

// DS: Product definition — change for production
const PRODUCT = {
  name: 'Buildor Pro',
  description: 'Buildor Pro plan — monthly',
  price: '2.00',
  currency: 'USD',
} as const;

type CheckoutStatus = 'loading-config' | 'ready' | 'success' | 'error' | 'no-config';

export function CheckoutPage(): JSX.Element {
  const [status, setStatus] = useState<CheckoutStatus>('loading-config');
  const [errorMsg, setErrorMsg] = useState('');
  const [clientId, setClientId] = useState('');
  const [paypalMode, setPaypalMode] = useState<'sandbox' | 'live'>('sandbox');

  // Load PayPal Client ID from Supabase app_config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchAppConfig();
        if (cancelled) return;
        const id = (cfg.paypal_client_id as string | undefined) ?? '';
        const mode = (cfg.paypal_mode as string | undefined) ?? 'sandbox';
        if (!id) {
          setStatus('no-config');
          return;
        }
        setClientId(id);
        setPaypalMode(mode === 'live' ? 'live' : 'sandbox');
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('no-config');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── No config ──────────────────────────────────────────────────────
  if (status === 'no-config') {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="checkout-error-icon">⚙️</div>
          <h2 className="checkout-title">PayPal not configured</h2>
          <p className="checkout-desc">
            PayPal credentials are not set up yet.{' '}
            <Link to="/admin" className="checkout-link">Go to Admin panel</Link> and add your PayPal Client ID.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-card-success">
          <div className="checkout-success-icon">✓</div>
          <h2 className="checkout-title">Payment successful!</h2>
          <p className="checkout-desc">
            Thank you for your purchase. You'll receive a confirmation shortly.
          </p>
          <Link to="/" className="btn-checkout-back">← Back to home</Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-card-error">
          <div className="checkout-error-icon">✕</div>
          <h2 className="checkout-title">Payment failed</h2>
          <p className="checkout-desc">{errorMsg || 'Something went wrong. Please try again.'}</p>
          <button
            className="btn-checkout-back"
            onClick={() => { setStatus('loading-config'); setErrorMsg(''); window.location.reload(); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Loading config ─────────────────────────────────────────────────
  if (status === 'loading-config') {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="checkout-loading">
            <div className="checkout-spinner" />
            <span>Loading payment…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready — PayPal SDK loaded ───────────────────────────────────────
  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <Link to="/" className="checkout-logo">
          <img src="/buildor-logo.svg" alt="Buildor" className="checkout-logo-img" />
          <span className="checkout-logo-name">Buildor</span>
        </Link>
        <span className="checkout-secure">🔒 Secure checkout</span>
      </header>

      <div className="checkout-body">
        {/* Order summary */}
        <div className="checkout-summary">
          <h2 className="checkout-summary-title">Order summary</h2>
          <div className="checkout-product">
            <div className="checkout-product-info">
              <span className="checkout-product-name">{PRODUCT.name}</span>
              <span className="checkout-product-desc">{PRODUCT.description}</span>
            </div>
            <span className="checkout-product-price">${PRODUCT.price}</span>
          </div>
          <div className="checkout-divider" />
          <div className="checkout-total">
            <span>Total</span>
            <span className="checkout-total-amount">${PRODUCT.price} {PRODUCT.currency}</span>
          </div>
        </div>

        {/* PayPal payment */}
        <div className="checkout-card">
          <h2 className="checkout-title">Complete payment</h2>
          <p className="checkout-desc">
            Pay with your PayPal account or any credit / debit card.
          </p>

          {/* NOTE: PayPalScriptProvider injects the SDK script automatically */}
          <PayPalScriptProvider
            options={{
              clientId: clientId,
              currency: PRODUCT.currency,
              intent: 'capture',
              // A11Y: sandbox mode for testing
              ...(paypalMode === 'sandbox' ? { 'data-namespace': 'paypal_sdk' } : {}),
            }}
          >
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'pay',
                height: 48,
              }}
              // NOTE: createOrder uses PayPal's built-in order creation (no backend needed)
              createOrder={(_data, actions) => {
                return actions.order.create({
                  intent: 'CAPTURE',
                  purchase_units: [
                    {
                      description: PRODUCT.description,
                      amount: {
                        currency_code: PRODUCT.currency,
                        value: PRODUCT.price,
                      },
                    },
                  ],
                });
              }}
              onApprove={async (_data, actions) => {
                if (!actions.order) return;
                await actions.order.capture();
                setStatus('success');
              }}
              onError={(err) => {
                setStatus('error');
                setErrorMsg(err instanceof Error ? err.message : 'Payment failed. Please try again.');
              }}
              onCancel={() => {
                // NOTE: User closed the popup — stay on checkout page, no error shown
              }}
            />
          </PayPalScriptProvider>

          <p className="checkout-footnote">
            Payments processed securely by PayPal. Your card details are never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
