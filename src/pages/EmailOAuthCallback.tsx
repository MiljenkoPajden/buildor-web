/**
 * EmailOAuthCallback — OAuth callback page for Buildor Email (Electron app).
 *
 * Flow:
 * 1. User clicks "Connect Gmail/Outlook" in Buildor Electron app
 * 2. Browser opens Google/Microsoft OAuth page
 * 3. After authorization, redirects here: buildor.app/auth/email?code=...
 * 4. This page displays the code for user to copy back to Buildor
 * 5. Also tries deep link buildor:// to auto-return to app
 */
import { useEffect, useState } from 'react';

export default function EmailOAuthCallback() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('code');
    const authError = params.get('error');
    const errorDesc = params.get('error_description');

    // Detect provider from issuer or URL
    const iss = params.get('iss') || '';
    if (iss.includes('google')) setProvider('Gmail');
    else if (iss.includes('microsoft') || iss.includes('login.live')) setProvider('Outlook');
    else setProvider('Email');

    if (authCode) {
      setCode(authCode);
      // Try to send code back to localhost Buildor backend
      fetch('http://localhost:5001/api/email/oauth/receive-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, provider: provider.toLowerCase() }),
      }).catch(() => {
        // If localhost is not reachable, user will copy manually
      });
    } else if (authError) {
      setError(errorDesc || authError || 'Authorization failed');
    } else {
      setError('No authorization code received');
    }
  }, []);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050910 0%, #0a1422 50%, #070b14 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Manrope', system-ui, sans-serif",
      color: '#e2e8f0',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: 'rgba(10, 20, 34, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.12)',
        borderRadius: 16,
        padding: '40px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.4) 25%, rgba(139,92,246,0.3) 50%, rgba(52,211,153,0.2) 75%, transparent)',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <svg width="48" height="48" viewBox="0 0 892 893" fill="none" style={{ margin: '0 auto 12px' }}>
            <rect x="12" y="11" width="868" height="868" rx="236" fill="url(#emcbGrad)" stroke="#244E74" strokeWidth="22"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M161 222L136 247V647L161 672H711L736 647V247L711 222H161ZM186 303V622H686V303L436 530L186 303ZM646 272H225L436 463L646 272Z" fill="#38BDF8"/>
            <defs><linearGradient id="emcbGrad" x1="60" y1="99" x2="848" y2="805" gradientUnits="userSpaceOnUse"><stop stopColor="#122D41"/><stop offset="1" stopColor="#191935"/></linearGradient></defs>
          </svg>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#56687e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Buildor Email
          </div>
        </div>

        {error ? (
          /* Error state */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✗</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>
              Authorization Failed
            </h2>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
              {error}
            </p>
            <p style={{ fontSize: 12, color: '#56687e' }}>
              Please close this tab and try again in Buildor.
            </p>
          </div>
        ) : code ? (
          /* Success state */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12, filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.4))' }}>✓</div>
            <h2 style={{
              fontSize: 20, fontWeight: 800, marginBottom: 8,
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {provider} Authorized
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
              Copy the authorization code below and paste it into Buildor Email Settings.
            </p>

            {/* Code display */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(56,189,248,0.15)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              position: 'relative',
            }}>
              <div style={{
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#38bdf8',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                userSelect: 'all',
                maxHeight: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {code}
              </div>
            </div>

            <button
              onClick={handleCopy}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.12)',
                color: copied ? '#34d399' : '#38bdf8',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Authorization Code'}
            </button>

            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(56,189,248,0.04)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>Next Steps</div>
              <ol style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8, paddingLeft: 20, margin: 0, textAlign: 'left' }}>
                <li>Go back to Buildor Email Settings</li>
                <li>Paste the code in the "Authorization Code" field</li>
                <li>Click "Connect"</li>
              </ol>
            </div>

            <p style={{ fontSize: 11, color: '#56687e', marginTop: 16 }}>
              You can close this tab after copying the code.
            </p>
          </div>
        ) : (
          /* Loading state */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Processing authorization...</div>
          </div>
        )}
      </div>
    </div>
  );
}
