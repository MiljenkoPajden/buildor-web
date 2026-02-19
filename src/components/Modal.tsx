import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Koji mode otvoriti — 'signin' (default) ili 'signup' */
  initialMode?: 'signin' | 'signup';
}

type AuthMode = 'signin' | 'signup';

export function Modal({ open, onClose, initialMode = 'signin' }: ModalProps): JSX.Element {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { login, signUp, signInWithGoogle, signInWithGitHub, devLogin } = useAuth();
  const navigate = useNavigate();
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) {
      setError('');
      setEmail('');
      setPassword('');
      setLoading(false);
      setSignUpSuccess(false);
      setMode(initialMode);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'signup') {
      const result = await signUp(email, password);
      setLoading(false);
      if (result.ok) {
        setSignUpSuccess(true);
      } else {
        setError(result.error ?? 'Registration failed.');
      }
      return;
    }
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      onClose();
      navigate('/admin');
    } else {
      setError(result.error ?? 'Sign in failed.');
    }
  };

  const handleGoogle = async (): Promise<void> => {
    setError('');
    setLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success: AuthContext redirects to Google, then Supabase redirects back to /admin
  };

  const handleGitHub = async (): Promise<void> => {
    setError('');
    setLoading(true);
    const result = await signInWithGitHub();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success: AuthContext redirects to GitHub, then Supabase redirects back to /admin
  };

  return (
    <div
      className={`modal-bg ${open ? 'on' : ''}`}
      id="modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="modal-box">
        <h2>Welcome to Buildor</h2>
        <p className="modal-sub">
          {mode === 'signup' ? 'Create your account' : 'Sign in to your agent workspace'}
        </p>
        {signUpSuccess ? (
          <p className="modal-success" style={{ marginBottom: 16, color: 'var(--green)' }}>
            Check your email to confirm your account. Then sign in below.
          </p>
        ) : null}
        <form onSubmit={handleSubmit}>
          <input
            className="modal-field"
            type="email"
            placeholder="you@company.com"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
          <input
            className="modal-field"
            type="password"
            placeholder={mode === 'signup' ? 'Choose a password (min 6 characters)' : 'Enter password'}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            disabled={loading}
          />
          {error && (
            <div className="modal-error-wrap" style={{ marginBottom: 12 }}>
              <p className="modal-error" style={{ color: 'var(--amber)', fontSize: '13px' }}>
                {error}
              </p>
              {error.includes('not configured') && (
                <p style={{ marginTop: 8, fontSize: 12 }}>
                  <button
                    type="button"
                    className="modal-link"
                    onClick={() => { onClose(); navigate('/admin'); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--cyan)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Open Admin to configure Supabase →
                  </button>
                </p>
              )}
            </div>
          )}
          {mode === 'signin' && (
            <div className="modal-row">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#">Forgot?</a>
            </div>
          )}
          <button type="submit" className="modal-submit" disabled={loading}>
            {loading
              ? mode === 'signup'
                ? 'Creating…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Sign Up'
                : 'Sign In'}
          </button>
        </form>
        <div className="modal-divider">or</div>
        <div className="modal-social">
          <button type="button" onClick={handleGoogle} disabled={loading} aria-label="Sign in with Google">
            <svg viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
          <button type="button" onClick={handleGitHub} disabled={loading} aria-label="Sign in with GitHub">
            <svg viewBox="0 0 24 24" fill="var(--text-1)">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </button>
        </div>
        <p className="modal-bottom">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button type="button" className="modal-link" onClick={() => { setMode('signup'); setError(''); }}>
                Create one free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="modal-link" onClick={() => { setMode('signin'); setError(''); setSignUpSuccess(false); }}>
                Sign in
              </button>
            </>
          )}
        </p>
        {isDev && (
          <p className="modal-dev">
            <button
              type="button"
              className="modal-dev-btn"
              onClick={() => {
                devLogin();
                onClose();
                navigate('/admin');
              }}
            >
              Dev ulaz
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default Modal;
