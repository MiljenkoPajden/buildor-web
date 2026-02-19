/**
 * usePortalData — fetches all portal data for a given client
 *
 * @features
 * - Parallel queries: projects, invoices, members+profiles
 * - Derives activity feed from recent updates
 * - refresh() for manual refetch
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';

// DS: no Supabase type-gen yet — cast to generic interface until added to build pipeline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; auth: any };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'upcoming' | 'completed' | 'archived' | 'paused';
  progress: number;
  start_date: string | null;
  due_date: string | null;
  archive_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'draft';
  currency: string;
  amount_total: number;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface MemberWithProfile {
  id: string;
  client_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'accountant';
  status: string;
  joined_at: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'project_update' | 'invoice_created' | 'invoice_paid' | 'member_joined';
  label: string;
  detail: string;
  timestamp: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // joined from profiles
  full_name: string | null;
  avatar_url: string | null;
}

interface PortalData {
  projects: Project[];
  invoices: Invoice[];
  members: MemberWithProfile[];
  activity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Activity derivation ────────────────────────────────────────────────────────

function deriveActivity(projects: Project[], invoices: Invoice[], members: MemberWithProfile[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  projects.slice(0, 5).forEach((p) => {
    items.push({
      id: `proj-${p.id}`,
      type: 'project_update',
      label: p.name,
      detail: `${p.status} · ${p.progress}% complete`,
      timestamp: p.updated_at,
    });
  });

  invoices.slice(0, 5).forEach((inv) => {
    items.push({
      id: `inv-${inv.id}`,
      type: inv.status === 'paid' ? 'invoice_paid' : 'invoice_created',
      label: `Invoice ${inv.invoice_number}`,
      detail: `${inv.currency} ${inv.amount_total.toFixed(2)} · ${inv.status}`,
      timestamp: inv.created_at,
    });
  });

  members.slice(0, 3).forEach((m) => {
    items.push({
      id: `mem-${m.id}`,
      type: 'member_joined',
      label: m.full_name ?? m.email ?? 'Team member',
      detail: `joined as ${m.role}`,
      timestamp: m.joined_at,
    });
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePortalData(clientId: string | null | undefined): PortalData {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;

    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) { setError('Supabase not configured'); return; }

    setIsLoading(true);
    setError(null);

    try {
      // NOTE: Parallel queries for performance
      const [projRes, invRes, memRes] = await Promise.all([
        sb.from('projects')
          .select('*')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false }),

        sb.from('invoices')
          .select('*')
          .eq('client_id', clientId)
          .order('issue_date', { ascending: false }),

        sb.from('client_members')
          .select('*, profiles(full_name, avatar_url, email)')
          .eq('client_id', clientId)
          .eq('status', 'active'),
      ]);

      if (projRes.error) throw new Error(projRes.error.message);
      if (invRes.error) throw new Error(invRes.error.message);
      if (memRes.error) throw new Error(memRes.error.message);

      // Flatten joined profiles into member rows
      const flatMembers: MemberWithProfile[] = ((memRes.data ?? []) as Array<Record<string, unknown>>).map((m) => {
        const p = m.profiles as Record<string, string | null> | null;
        return {
          id: m.id as string,
          client_id: m.client_id as string,
          user_id: m.user_id as string,
          role: m.role as MemberWithProfile['role'],
          status: m.status as string,
          joined_at: m.joined_at as string,
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          email: p?.email ?? null,
        };
      });

      setProjects((projRes.data ?? []) as Project[]);
      setInvoices((invRes.data ?? []) as Invoice[]);
      setMembers(flatMembers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portal data');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return {
    projects,
    invoices,
    members,
    activity: deriveActivity(projects, invoices, members),
    isLoading,
    error,
    refresh: load,
  };
}

// ── Project messages hook ──────────────────────────────────────────────────────

export function useProjectMessages(projectId: string | null): {
  messages: ProjectMessage[];
  isLoading: boolean;
  send: (content: string, userId: string, clientId: string) => Promise<void>;
  refresh: () => void;
} {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;

    setIsLoading(true);
    const { data } = await sb
      .from('project_messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    const flat: ProjectMessage[] = ((data ?? []) as Array<Record<string, unknown>>).map((m) => {
      const p = m.profiles as Record<string, string | null> | null;
      return {
        id: m.id as string,
        project_id: m.project_id as string,
        user_id: m.user_id as string,
        content: m.content as string,
        created_at: m.created_at as string,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    setMessages(flat);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const send = useCallback(async (content: string, userId: string, clientId: string) => {
    if (!projectId) return;
    const sb = getSupabaseClient() as AnySupabase | null;
    if (!sb) return;
    await sb.from('project_messages').insert({ project_id: projectId, client_id: clientId, user_id: userId, content });
    await load();
  }, [projectId, load]);

  return { messages, isLoading, send, refresh: load };
}
