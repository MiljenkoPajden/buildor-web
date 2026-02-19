import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

// DS: no type-gen yet — cast until Supabase types are generated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; auth: any };

// NOTE: Portal invite token is stored in sessionStorage before OAuth redirect.
// After OAuth callback, we pick it up here and accept the invite automatically.
const PORTAL_TOKEN_KEY = 'portal_pending_token';

/**
 * OAuth callback: Supabase redirects here with tokens in the URL hash.
 * If a portal invite token exists in sessionStorage → accept invite → /portal.
 * Otherwise → /admin (default behaviour).
 */
export function AuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [waited, setWaited] = useState(false);
  // NOTE: Guard against double-run in StrictMode
  const handledRef = useRef(false);

  // Fallback timer in case auth event never fires
  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.length > 0;
    if (!hasHash) {
      redirectAfterAuth();
      return;
    }
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!waited) return;
    redirectAfterAuth();
  }, [waited]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoggedIn) return;
    redirectAfterAuth();
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Checks sessionStorage for a pending portal invite token.
   * If found → accepts the invite for the current user → navigate('/portal').
   * If not found → navigate('/admin').
   */
  async function redirectAfterAuth(): Promise<void> {
    if (handledRef.current) return;
    handledRef.current = true;

    const portalToken = sessionStorage.getItem(PORTAL_TOKEN_KEY);

    if (!portalToken) {
      navigate('/admin', { replace: true });
      return;
    }

    // Clear token immediately to avoid re-use on page reload
    sessionStorage.removeItem(PORTAL_TOKEN_KEY);

    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) {
        navigate('/admin', { replace: true });
        return;
      }

      // Get current user (session should be active after OAuth)
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user) {
        console.error('[AuthCallback] No user after OAuth:', userError);
        navigate('/admin', { replace: true });
        return;
      }

      // Fetch the invite to get client_id + role
      const { data: invite, error: inviteError } = await sb
        .from('client_invites')
        .select('id, client_id, role, status, expires_at')
        .eq('token', portalToken)
        .single();

      if (inviteError || !invite) {
        console.warn('[AuthCallback] Invalid portal invite token');
        navigate('/portal/login', { replace: true });
        return;
      }

      // Validate invite is still usable
      const isExpired = new Date(invite.expires_at) < new Date();
      if (invite.status !== 'pending' || isExpired) {
        console.warn('[AuthCallback] Portal invite expired or already used');
        navigate('/portal', { replace: true });
        return;
      }

      // Accept: mark invite as accepted + upsert membership
      const [inviteUpdate, memberUpsert] = await Promise.all([
        sb.from('client_invites')
          .update({ status: 'accepted' })
          .eq('id', invite.id),
        sb.from('client_members')
          .upsert(
            { client_id: invite.client_id, user_id: user.id, role: invite.role, status: 'active' },
            { onConflict: 'client_id,user_id', ignoreDuplicates: true }
          ),
      ]);

      if (inviteUpdate.error) console.warn('[AuthCallback] Invite update error:', inviteUpdate.error);
      if (memberUpsert.error) console.warn('[AuthCallback] Member upsert error:', memberUpsert.error);

      navigate('/portal', { replace: true });
    } catch (err) {
      console.error('[AuthCallback] Unexpected error during portal accept:', err);
      navigate('/portal', { replace: true });
    }
  }

  return (
    <div className="auth-callback-page">
      <p>Signing you in…</p>
      <p className="auth-callback-hint">You will be redirected shortly.</p>
    </div>
  );
}

export default AuthCallbackPage;
