import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OAuth callback: Supabase redirects here with tokens in the URL hash.
 * We wait for the session to be set, then redirect to /admin.
 */
export function AuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading } = useAuth();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.length > 0;
    if (!hasHash) {
      navigate('/admin', { replace: true });
      return;
    }
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  useEffect(() => {
    if (!waited) return;
    navigate('/admin', { replace: true });
  }, [waited, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/admin', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="auth-callback-page">
      <p>Signing you in…</p>
      <p className="auth-callback-hint">You will be redirected to Admin.</p>
    </div>
  );
}

export default AuthCallbackPage;
