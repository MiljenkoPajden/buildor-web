/**
 * useInvite — token-based invite resolution and acceptance
 *
 * @features
 * - Validates invite token before auth
 * - Works with anon users (public SELECT on client_invites)
 * - acceptInvite() upserts client_members after auth
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';

// DS: no Supabase type-gen yet — cast to generic interface until added to build pipeline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; auth: any };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface InviteData {
  id: string;
  client_id: string;
  email: string;
  role: 'owner' | 'contributor' | 'accountant';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  client_name: string;
  client_company: string | null;
  client_logo_url: string | null;
}

export type InviteStatus =
  | 'loading'
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'already-accepted'
  | 'revoked';

interface UseInviteResult {
  inviteData: InviteData | null;
  status: InviteStatus;
  acceptInvite: (userId: string) => Promise<{ ok: boolean; error?: string }>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useInvite(token: string | undefined): UseInviteResult {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [status, setStatus] = useState<InviteStatus>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    let cancelled = false;
    (async () => {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) { setStatus('invalid'); return; }

      // Step 1 — fetch invite record (anon can read via public SELECT policy)
      const { data, error } = await sb
        .from('client_invites')
        .select('id, client_id, email, role, status, expires_at')
        .eq('token', token)
        .single();

      if (cancelled) return;

      if (error || !data) { setStatus('invalid'); return; }

      const invite = data as Record<string, unknown>;

      // Step 2 — fetch client name via security-definer RPC (anon-accessible)
      let clientName = 'Your workspace';
      let clientCompany: string | null = null;
      let clientLogoUrl: string | null = null;

      // NOTE: uses get_client_by_invite_token RPC — anon can call this,
      // it validates token + expiry internally so we don't expose all clients publicly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientRows } = await (sb as any).rpc('get_client_by_invite_token', { p_token: token });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientRow: Record<string, string | null> | undefined = Array.isArray(clientRows) ? (clientRows[0] as any) : undefined;
      if (clientRow) {
        clientName = clientRow.name ?? 'Your workspace';
        clientCompany = clientRow.company ?? null;
        clientLogoUrl = clientRow.logo_url ?? null;
      }

      if (cancelled) return;

      const parsed: InviteData = {
        id: invite.id as string,
        client_id: invite.client_id as string,
        email: invite.email as string,
        role: invite.role as InviteData['role'],
        status: invite.status as InviteData['status'],
        expires_at: invite.expires_at as string,
        client_name: clientName,
        client_company: clientCompany,
        client_logo_url: clientLogoUrl,
      };

      setInviteData(parsed);

      if (parsed.status === 'accepted') { setStatus('already-accepted'); return; }
      if (parsed.status === 'revoked') { setStatus('revoked'); return; }
      if (new Date(parsed.expires_at) < new Date()) { setStatus('expired'); return; }

      setStatus('valid');
    })();

    return () => { cancelled = true; };
  }, [token]);

  const acceptInvite = useCallback(async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!inviteData || status !== 'valid') {
      return { ok: false, error: 'Invite is not valid' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return { ok: false, error: 'Supabase not configured' };

    try {
      // Step 1 — mark invite as accepted
      const { error: updateErr } = await sb
        .from('client_invites')
        .update({ status: 'accepted', accepted_by: userId, accepted_at: new Date().toISOString() })
        .eq('id', inviteData.id);

      if (updateErr) return { ok: false, error: updateErr.message };

      // Step 2 — create membership (ignore conflict if already exists)
      const { error: insertErr } = await sb
        .from('client_members')
        .upsert(
          {
            client_id: inviteData.client_id,
            user_id: userId,
            role: inviteData.role,
            invite_id: inviteData.id,
          },
          { onConflict: 'client_id,user_id', ignoreDuplicates: true }
        );

      if (insertErr) return { ok: false, error: insertErr.message };

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }, [inviteData, status]);

  return { inviteData, status, acceptInvite };
}
