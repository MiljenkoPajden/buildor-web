/**
 * PortalContext — client portal membership state
 *
 * @features
 * - Resolves current user's client membership from Supabase
 * - Exposes role-based permission flags
 * - Independent from AuthContext (auth knows user, portal knows membership)
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from './AuthContext';

// DS: Supabase client has no generated types for our custom tables yet.
// We cast to a generic db interface until we add type-gen to the build pipeline.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; auth: any };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClientRecord {
  id: string;
  name: string;
  company: string | null;
  logo_url: string | null;
  email: string;
}

export interface ClientMember {
  id: string;
  client_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'accountant';
  status: string;
  joined_at: string;
}

export type PortalRole = 'owner' | 'contributor' | 'accountant';

interface PortalContextValue {
  client: ClientRecord | null;
  member: ClientMember | null;
  role: PortalRole | null;
  /** owner + contributor can see projects */
  canSeeProjects: boolean;
  /** owner + accountant can see finances */
  canSeeFinances: boolean;
  /** only owner sees team */
  canSeeTeam: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside <PortalProvider>');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

interface PortalProviderProps {
  children: ReactNode;
}

export function PortalProvider({ children }: PortalProviderProps): JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [member, setMember] = useState<ClientMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setClient(null);
      setMember(null);
      setIsLoading(false);
      return;
    }

    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1 — find membership for this user
      const { data: memberData, error: memberErr } = await sb
        .from('client_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (memberErr || !memberData) {
        // No membership found — not a portal user (could be admin-only)
        setClient(null);
        setMember(null);
        setIsLoading(false);
        return;
      }

      setMember(memberData as ClientMember);

      // Step 2 — fetch the client record
      const { data: clientData, error: clientErr } = await sb
        .from('clients')
        .select('id, name, company, logo_url, email')
        .eq('id', memberData.client_id)
        .single();

      if (clientErr || !clientData) {
        setError('Failed to load client data');
        setIsLoading(false);
        return;
      }

      setClient(clientData as ClientRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const role = member?.role ?? null;

  const value: PortalContextValue = {
    client,
    member,
    role,
    canSeeProjects: role === 'owner' || role === 'contributor',
    canSeeFinances: role === 'owner' || role === 'accountant',
    canSeeTeam: role === 'owner',
    isLoading: authLoading || isLoading,
    error,
    refresh: load,
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
