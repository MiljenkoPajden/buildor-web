/**
 * PortalLoginPage — standalone login for /portal/login
 * Full-page version of Modal.tsx logic, redirects to /portal on success
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/client-portal.css';

type LoginMode = 'options' | 'email';

export function PortalLoginPage(): JSX.Element {
  const { login, signUp, signInWithGoogle, signInWithGitHub, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('options');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — send to portal
  if (isLoggedIn) {
    navigate('/portal', { replace: true });
    return <div className="portal-loading"><div className="portal-spinner" /></div>;
  }

  const handleOAuth = async (provider: 'google' | 'github'): Promise<void> => {
    setError('');
    setLoading(true);
    const fn = provider === 'google' ? signInWithGoogle : signInWithGitHub;
    const result = await fn();
    if (result?.error) { setError(result.error); setLoading(false); }
    // OAuth redirects away — no need to navigate
  };

  const handleEmail = async (): Promise<void> => {
    if (!email || !password) { setError('Enter email and password.'); return; }
    setError('');
    setLoading(true);
    const fn = authMode === 'signin' ? login : signUp;
    const result = await fn(email, password);
    if (!result.ok) {
      setError(result.error ?? 'Authentication failed');
      setLoading(false);
    } else {
      navigate('/portal', { replace: true });
    }
  };

  return (
    <div className="portal-login-page">
      <div className="portal-invite-card">
        <div className="portal-invite-logo">🏢</div>
        <h1 className="portal-invite-title">Client Portal</h1>
        <p className="portal-invite-sub">Sign in to access your workspace.</p>

        {error && <div className="portal-invite-error">{error}</div>}

        {mode === 'options' && (
          <>
            <button className="portal-invite-auth-btn" onClick={() => handleOAuth('google')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button className="portal-invite-auth-btn" onClick={() => handleOAuth('github')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"/></svg>
              Continue with GitHub
            </button>

            <div className="portal-invite-divider">
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span className="portal-invite-divider-label">or use email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <button className="portal-invite-auth-btn" onClick={() => setMode('email')}>
              ✉️ Continue with Email
            </button>
          </>
        )}

        {mode === 'email' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className="portal-filter-tab"
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button
                className="portal-filter-tab"
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>
            <input
              className="portal-invite-field"
              type="email" placeholder="Email address"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="portal-invite-field"
              type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
            />
            <button className="portal-invite-submit" onClick={handleEmail} disabled={loading}>
              {loading ? 'Please wait…' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button
              className="portal-invite-auth-btn"
              style={{ marginTop: 10 }}
              onClick={() => { setMode('options'); setError(''); }}
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PortalLoginPage;
