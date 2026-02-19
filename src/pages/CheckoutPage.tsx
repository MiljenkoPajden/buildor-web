/**
 * CheckoutPage — PayPal checkout using @paypal/react-paypal-js
 *
 * @features
 * - PayPal popup with card + PayPal account support
 * - Client ID loaded from Supabase app_config
 * - PayPalButtons rendered only after SDK is fully resolved
 * - Success / Error / Loading / No-config states
 *
 * @tokens bg-dark, bg-panel, bg-elevated, text-primary, border-default
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { fetchAppConfig } from '../lib/supabase';

// DS: Product definition — change for production
const PRODUCT = {
  name: 'Buildor Pro',
  description: 'Buildor Pro plan — monthly',
  price: '2.00',
  currency: 'USD',
} as const;

type CheckoutStatus = 'loading-config' | 'ready' | 'success' | 'error' | 'no-config';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Must be a CHILD of PayPalScriptProvider to use usePayPalScriptReducer.
// This component waits for the SDK script to be fully loaded before rendering
// PayPalButtons — prevents "window.paypal.Buttons is undefined" error.
// ─────────────────────────────────────────────────────────────────────────────
interface PayPalButtonsWrapperProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PayPalButtonsWrapper({ onSuccess, onError }: PayPalButtonsWrapperProps): JSX.Element {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <div className="checkout-loading">
        <div className="checkout-spinner" />
        <span>Loading PayPal…</span>
      </div>
    );
  }

  if (isRejected) {
    return (
      <p className="checkout-desc" style={{ color: '#ef4444' }}>
        Failed to load PayPal. Check your Client ID in the Admin panel.
      </p>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
        height: 48,
      }}
      // NOTE: createOrder uses PayPal's client-side SDK — no backend needed
      createOrder={(_data, actions) =>
        actions.order.create({
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
        })
      }
      onApprove={async (_data, actions) => {
        if (!actions.order) return;
        await actions.order.capture();
        onSuccess();
      }}
      onError={(err) => {
        onError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      }}
      onCancel={() => {
        // NOTE: User cancelled — stay on page silently
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export function CheckoutPage(): JSX.Element {
  const [status, setStatus] = useState<CheckoutStatus>('loading-config');
  const [errorMsg, setErrorMsg] = useState('');
  const [clientId, setClientId] = useState('');
  const [sdkEnvironment, setSdkEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Load PayPal Client ID from Supabase app_config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchAppConfig();
        if (cancelled) return;
        const id = cfg.paypal_client_id ?? '';
        const mode = cfg.paypal_mode ?? 'sandbox';
        if (!id) { setStatus('no-config'); return; }
        setClientId(id);
        setSdkEnvironment(mode === 'live' ? 'production' : 'sandbox');
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('no-config');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Loading config ──────────────────────────────────────────────────
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

  // ── No config ───────────────────────────────────────────────────────
  if (status === 'no-config') {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="checkout-error-icon">⚙️</div>
          <h2 className="checkout-title">PayPal not configured</h2>
          <p className="checkout-desc">
            Go to the{' '}
            <Link to="/admin" className="checkout-link">Admin panel</Link>
            {' '}and add your PayPal Client ID.
          </p>
        </div>
      </div>
    );
  }

  // ── Payment success ─────────────────────────────────────────────────
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

  // ── Payment error ───────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-card-error">
          <div className="checkout-error-icon">✕</div>
          <h2 className="checkout-title">Payment failed</h2>
          <p className="checkout-desc">{errorMsg || 'Something went wrong. Please try again.'}</p>
          <button
            className="btn-checkout-back"
            onClick={() => { setStatus('ready'); setErrorMsg(''); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready — render PayPal ───────────────────────────────────────────
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

        {/* PayPal payment widget */}
        <div className="checkout-card">
          <h2 className="checkout-title">Complete payment</h2>
          <p className="checkout-desc">
            Pay with PayPal or any credit / debit card.
          </p>

          {/*
            NOTE: PayPalScriptProvider loads the SDK script.
            PayPalButtonsWrapper (child) uses usePayPalScriptReducer to wait
            for isPending → isResolved before rendering PayPalButtons.
            Without this guard, PayPalButtons crashes with
            "window.paypal.Buttons is undefined".
          */}
          <PayPalScriptProvider
            options={{
              clientId,
              currency: PRODUCT.currency,
              intent: 'capture',
              components: 'buttons',
              // PERF: sandbox environment avoids loading live SDK in dev/test
              environment: sdkEnvironment,
            }}
          >
            <PayPalButtonsWrapper
              onSuccess={() => setStatus('success')}
              onError={(msg) => { setStatus('error'); setErrorMsg(msg); }}
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
