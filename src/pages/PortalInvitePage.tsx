/**
 * PortalInvitePage — invite token redemption page
 * Route: /portal/:token
 *
 * @features
 * - Validates token before auth (anon Supabase SELECT)
 * - Shows branded welcome card with client name
 * - OAuth: stores token in sessionStorage → auth → callback picks it up
 * - Email/pass: inline form → acceptInvite() → navigate('/portal')
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInvite } from '../hooks/useInvite';
import '../styles/client-portal.css';

export function PortalInvitePage(): JSX.Element {
  const { token } = useParams<{ token: string }>();
  const { inviteData, status, acceptInvite } = useInvite(token);
  const { signInWithGoogle, signInWithGitHub, login, signUp, user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user is already logged in and invite is valid → accept immediately
  const handleAcceptForLoggedIn = async (): Promise<void> => {
    if (!user?.id) return;
    setLoading(true);
    const result = await acceptInvite(user.id);
    if (result.ok) {
      navigate('/portal', { replace: true });
    } else {
      setError(result.error ?? 'Failed to accept invite');
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github'): Promise<void> => {
    setError('');
    // NOTE: Store token so AuthCallbackPage can pick it up after redirect
    sessionStorage.setItem('portal_pending_token', token ?? '');
    sessionStorage.setItem('portal_redirect', '/portal');
    const fn = provider === 'google' ? signInWithGoogle : signInWithGitHub;
    const result = await fn();
    if (result?.error) {
      sessionStorage.removeItem('portal_pending_token');
      setError(result.error);
    }
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
      return;
    }
    // After email auth, user is now logged in — accept invite
    // We need to get the user ID from auth — re-check after login
    // Small delay for session to propagate
    await new Promise((r) => setTimeout(r, 500));
    // Get fresh user from Supabase
    const { getSupabaseClient } = await import('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    const { data: { user: freshUser } } = await sb.auth.getUser();
    if (freshUser && token) {
      const res = await acceptInvite(freshUser.id);
      if (res.ok) {
        navigate('/portal', { replace: true });
      } else {
        setError(res.error ?? 'Failed to join portal');
        setLoading(false);
      }
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="portal-invite-page">
        <div className="portal-invite-card">
          <div className="portal-loading" style={{ height: 'auto', padding: '24px 0', background: 'transparent' }}>
            <div className="portal-spinner" />
            <span style={{ color: '#64748b', fontSize: 14 }}>Validating invite…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid / expired / revoked ─────────────────────────────
  if (status === 'invalid' || status === 'expired' || status === 'revoked') {
    const msgs: Record<string, { icon: string; title: string; desc: string }> = {
      invalid: { icon: '🔗', title: 'Invalid invite', desc: 'This invite link is invalid or does not exist.' },
      expired: { icon: '⏰', title: 'Invite expired', desc: 'This invite link has expired. Ask your account manager to send a new one.' },
      revoked: { icon: '🚫', title: 'Invite revoked', desc: 'This invite has been revoked. Please contact your account manager.' },
    };
    const m = msgs[status] ?? { icon: '⚠️', title: 'Error', desc: 'Something went wrong.' };
    return (
      <div className="portal-invite-page">
        <div className="portal-invite-card">
          <div className="portal-invite-status">
            <div className="portal-invite-status-icon">{m.icon}</div>
            <div className="portal-invite-status-title">{m.title}</div>
            <div className="portal-invite-status-desc">{m.desc}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Already accepted ────────────────────────────────────────
  if (status === 'already-accepted') {
    return (
      <div className="portal-invite-page">
        <div className="portal-invite-card">
          <div className="portal-invite-status">
            <div className="portal-invite-status-icon">✅</div>
            <div className="portal-invite-status-title">Already accepted</div>
            <div className="portal-invite-status-desc">
              This invite was already used. Sign in to access your portal.
            </div>
            <button
              className="portal-invite-submit"
              onClick={() => navigate('/portal/login')}
              style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
            >
              Go to Portal Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Valid invite ────────────────────────────────────────────
  const companyLabel = inviteData?.client_company ?? inviteData?.client_name ?? 'your workspace';

  return (
    <div className="portal-invite-page">
      <div className="portal-invite-card">
        <div className="portal-invite-logo">
          {inviteData?.client_logo_url
            ? <img src={inviteData.client_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
            : '🏢'
          }
        </div>

        <h1 className="portal-invite-title">
          You're invited to<br />
          <span className="portal-invite-company">{companyLabel}</span>
        </h1>
        <p className="portal-invite-sub">
          Sign in or create an account to access your client portal.
          {inviteData?.role && (
            <> You'll join as <strong style={{ color: '#94a3b8' }}>{inviteData.role}</strong>.</>
          )}
        </p>

        {error && <div className="portal-invite-error">{error}</div>}

        {/* Already logged in */}
        {isLoggedIn && user ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
              Signed in as <strong style={{ color: '#f1f5f9' }}>{user.email}</strong>
            </p>
            <button className="portal-invite-submit" onClick={handleAcceptForLoggedIn} disabled={loading}>
              {loading ? 'Joining…' : 'Join Portal'}
            </button>
          </div>
        ) : !showEmail ? (
          <>
            <button className="portal-invite-auth-btn" onClick={() => handleOAuth('google')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button className="portal-invite-auth-btn" onClick={() => handleOAuth('github')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"/></svg>
              Continue with GitHub
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: 11, color: '#475569' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <button className="portal-invite-auth-btn" onClick={() => setShowEmail(true)}>
              ✉️ Continue with Email
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  className="portal-filter-tab"
                  style={{ flex: 1, textAlign: 'center' }}
                  onClick={() => setAuthMode(m)}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
            <input className="portal-invite-field" type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="portal-invite-field" type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmail()} />
            <button className="portal-invite-submit" onClick={handleEmail} disabled={loading}>
              {loading ? 'Please wait…' : authMode === 'signin' ? 'Sign In & Join' : 'Create Account & Join'}
            </button>
            <button className="portal-invite-auth-btn" style={{ marginTop: 8 }}
              onClick={() => { setShowEmail(false); setError(''); }}>
              ← Back
            </button>
          </>
        )}

        <p style={{ fontSize: 11, color: '#334155', marginTop: 20, lineHeight: 1.5 }}>
          By joining, you agree to Buildor's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default PortalInvitePage;
