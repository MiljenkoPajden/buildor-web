/**
 * CheckoutPage — PayPal Advanced Card Fields checkout
 *
 * @features
 * - Customers pay by card (Visa/Mastercard) without a PayPal account
 * - PayPal Client ID loaded from Supabase app_config (set in Admin panel)
 * - $2 test product (configurable via PRODUCT constant)
 * - Success / Error / Loading states
 *
 * @tokens bg-dark, bg-panel, bg-elevated, text-primary, border-default
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAppConfig } from '../lib/supabase';

// DS: Product definition — change for production
const PRODUCT = {
  name: 'Buildor Test',
  description: 'Test payment — $2.00',
  price: '2.00',
  currency: 'USD',
} as const;

type CheckoutStatus = 'loading-config' | 'ready' | 'processing' | 'success' | 'error' | 'no-config';

// PayPal SDK types (injected via script tag)
declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: unknown) => { render: (el: string | HTMLElement) => Promise<void> };
      HostedFields?: {
        isEligible: () => boolean;
        render: (opts: unknown) => Promise<{
          submit: (opts?: unknown) => Promise<unknown>;
        }>;
      };
    };
  }
}

export function CheckoutPage(): JSX.Element {
  const [status, setStatus] = useState<CheckoutStatus>('loading-config');
  const [errorMsg, setErrorMsg] = useState('');
  const [clientId, setClientId] = useState('');
  const sdkLoaded = useRef(false);
  const hostedFieldsRef = useRef<{ submit: (opts?: unknown) => Promise<unknown> } | null>(null);

  // Load PayPal Client ID from Supabase app_config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchAppConfig();
        if (cancelled) return;
        const id = cfg.paypal_client_id ?? '';
        if (!id) {
          setStatus('no-config');
          return;
        }
        setClientId(id);
      } catch {
        if (!cancelled) setStatus('no-config');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Inject PayPal JS SDK once clientId is known
  useEffect(() => {
    if (!clientId || sdkLoaded.current) return;
    sdkLoaded.current = true;

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${PRODUCT.currency}&components=buttons,hosted-fields&intent=capture`;
    script.setAttribute('data-sdk-integration-source', 'builder-checkout');
    script.onload = () => initPayPal();
    script.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to load PayPal SDK. Check your Client ID.');
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [clientId]);

  const initPayPal = (): void => {
    if (!window.paypal) return;

    // NOTE: Use Hosted Fields if eligible (card without PayPal login)
    // Falls back to standard PayPal Buttons if Hosted Fields not available
    if (window.paypal.HostedFields?.isEligible()) {
      window.paypal.HostedFields.render({
        createOrder: createOrder,
        styles: {
          '.valid': { color: '#22c55e' },
          '.invalid': { color: '#ef4444' },
          'input': {
            'font-size': '15px',
            'font-family': 'Inter, sans-serif',
            'color': '#f1f5f9',
            'background': 'transparent',
          },
        },
        fields: {
          number: { selector: '#card-number', placeholder: '4111 1111 1111 1111' },
          cvv: { selector: '#card-cvv', placeholder: '123' },
          expirationDate: { selector: '#card-expiry', placeholder: 'MM/YY' },
        },
      }).then((hf) => {
        hostedFieldsRef.current = hf;
        setStatus('ready');
      }).catch(() => {
        // Fallback to buttons
        renderPayPalButtons();
      });
    } else {
      renderPayPalButtons();
    }
  };

  const createOrder = async (): Promise<string> => {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: PRODUCT.price, currency: PRODUCT.currency }),
    });
    if (!res.ok) throw new Error('Failed to create order');
    const data = await res.json() as { id: string };
    return data.id;
  };

  const renderPayPalButtons = (): void => {
    if (!window.paypal) return;
    window.paypal.Buttons({
      createOrder: createOrder,
      onApprove: async (data: { orderID: string }) => {
        setStatus('processing');
        await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID }),
        });
        setStatus('success');
      },
      onError: (err: unknown) => {
        setStatus('error');
        setErrorMsg(String(err));
      },
    }).render('#paypal-buttons');
    setStatus('ready');
  };

  const handleCardSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!hostedFieldsRef.current) return;
    setStatus('processing');
    try {
      await hostedFieldsRef.current.submit({ contingencies: ['3D_SECURE'] });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

  // ── Render states ──────────────────────────────────────────────────

  if (status === 'no-config') {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="checkout-error-icon">⚙️</div>
          <h2 className="checkout-title">PayPal not configured</h2>
          <p className="checkout-desc">
            PayPal credentials are not set up yet.{' '}
            <Link to="/admin" className="checkout-link">Go to Admin panel</Link> and add your PayPal Client ID and Secret.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-card-success">
          <div className="checkout-success-icon">✓</div>
          <h2 className="checkout-title">Payment successful!</h2>
          <p className="checkout-desc">Thank you for your purchase. You'll receive a confirmation shortly.</p>
          <Link to="/" className="btn-checkout-back">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-card-error">
          <div className="checkout-error-icon">✕</div>
          <h2 className="checkout-title">Payment failed</h2>
          <p className="checkout-desc">{errorMsg || 'Something went wrong. Please try again.'}</p>
          <button className="btn-checkout-back" onClick={() => { setStatus('loading-config'); setErrorMsg(''); sdkLoaded.current = false; window.location.reload(); }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

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

        {/* Payment form */}
        <div className="checkout-card">
          <h2 className="checkout-title">Pay by card</h2>
          <p className="checkout-desc">No PayPal account needed — enter your card details below.</p>

          {(status === 'loading-config') && (
            <div className="checkout-loading">
              <div className="checkout-spinner" />
              <span>Loading payment form…</span>
            </div>
          )}

          {/* PayPal Hosted Fields — card inputs */}
          <form
            id="card-form"
            onSubmit={handleCardSubmit}
            style={{ display: status === 'ready' && hostedFieldsRef.current ? 'block' : 'none' }}
          >
            <div className="checkout-field-group">
              <label className="checkout-label">Card number</label>
              <div id="card-number" className="checkout-hosted-field" />
            </div>
            <div className="checkout-field-row">
              <div className="checkout-field-group">
                <label className="checkout-label">Expiry date</label>
                <div id="card-expiry" className="checkout-hosted-field" />
              </div>
              <div className="checkout-field-group">
                <label className="checkout-label">CVV</label>
                <div id="card-cvv" className="checkout-hosted-field" />
              </div>
            </div>
            <button
              type="submit"
              className="btn-checkout-pay"
              disabled={status === 'processing'}
            >
              {status === 'processing' ? (
                <><span className="checkout-spinner-sm" /> Processing…</>
              ) : (
                `Pay $${PRODUCT.price}`
              )}
            </button>
          </form>

          {/* PayPal Buttons fallback */}
          <div
            id="paypal-buttons"
            style={{ display: status === 'ready' && !hostedFieldsRef.current ? 'block' : 'none', marginTop: '1rem' }}
          />

          <p className="checkout-footnote">
            Payments processed securely by PayPal. Your card details are never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
