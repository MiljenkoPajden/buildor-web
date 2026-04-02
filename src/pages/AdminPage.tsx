import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStoredSupabaseConfig,
  setStoredSupabaseConfig,
  isSupabaseConfigured,
  fetchAppConfig,
  saveAppConfig,
  getSupabaseClient,
} from '../lib/supabase';
import { AdminMockStatic } from './AdminMockStatic';
import { ProfileSwitcher, ProfileColorBanner, AdminProfilesPage } from '../components/admin/ProfileManager';

// DS: no type-gen yet — cast until Supabase types are generated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = { from: (table: string) => any; auth: any };

const MOCK_STORAGE_KEY = 'buildor_admin_show_mock';

export type AdminPageId = 'api' | 'users' | 'clients' | 'profiles' | 'dashboard' | 'projects' | 'deliverables' | 'usage' | 'billing' | 'settings';

// ─── Client Portal Types ──────────────────────────────────────────────────────

interface ClientRecord {
  id: string;
  name: string;
  company: string | null;
  email: string;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface InviteRecord {
  id: string;
  client_id: string;
  token: string;
  role: 'owner' | 'contributor' | 'accountant';
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
}

// ─── Admin Clients Section ────────────────────────────────────────────────────

function AdminClientsSection(): JSX.Element {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New client form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite state: clientId → InviteRecord[]
  const [invites, setInvites] = useState<Record<string, InviteRecord[]>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, 'owner' | 'contributor' | 'accountant'>>({});
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Track expanded client cards
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const loadedRef = useRef(false);

  // Load clients from Supabase
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadClients();
  }, []);

  async function loadClients(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) throw new Error('Supabase not configured');
      const { data, error: err } = await sb
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setClients((data ?? []) as ClientRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  async function loadInvitesForClient(clientId: string): Promise<void> {
    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) return;
      const { data, error: err } = await sb
        .from('client_invites')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setInvites((prev) => ({ ...prev, [clientId]: (data ?? []) as InviteRecord[] }));
    } catch {
      // Silently fail — table might not exist yet
    }
  }

  async function handleCreateClient(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) throw new Error('Supabase not configured');
      const { data: { user } } = await sb.auth.getUser();
      const { data, error: err } = await sb
        .from('clients')
        .insert({
          name: newName.trim(),
          email: newEmail.trim(),
          company: newCompany.trim() || null,
          notes: newNotes.trim() || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (err) throw err;
      setClients((prev) => [data as ClientRecord, ...prev]);
      setNewName('');
      setNewEmail('');
      setNewCompany('');
      setNewNotes('');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create client');
    } finally {
      setCreating(false);
    }
  }

  async function generateInvite(clientId: string): Promise<void> {
    const role = inviteRole[clientId] ?? 'owner';
    setGeneratingFor(clientId);
    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) throw new Error('Supabase not configured');
      const { data, error: err } = await sb
        .from('client_invites')
        .insert({ client_id: clientId, role })
        .select()
        .single();
      if (err) throw err;
      setInvites((prev) => ({
        ...prev,
        [clientId]: [data as InviteRecord, ...(prev[clientId] ?? [])],
      }));
    } catch (e) {
      console.error('Failed to generate invite:', e);
    } finally {
      setGeneratingFor(null);
    }
  }

  async function revokeInvite(inviteId: string, clientId: string): Promise<void> {
    try {
      const sb = getSupabaseClient() as AnySupabase | null;
      if (!sb) return;
      await sb.from('client_invites').update({ status: 'revoked' }).eq('id', inviteId);
      setInvites((prev) => ({
        ...prev,
        [clientId]: (prev[clientId] ?? []).map((inv) =>
          inv.id === inviteId ? { ...inv, status: 'revoked' as const } : inv
        ),
      }));
    } catch (e) {
      console.error('Failed to revoke invite:', e);
    }
  }

  function copyInviteLink(token: string): void {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  }

  function toggleExpand(clientId: string): void {
    const next = expandedClient === clientId ? null : clientId;
    setExpandedClient(next);
    if (next && !invites[next]) {
      void loadInvitesForClient(next);
    }
  }

  function getInviteUrl(token: string): string {
    return `${window.location.origin}/portal/${token}`;
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    contributor: 'Contributor',
    accountant: 'Accountant',
  };

  return (
    <div className="admin-panel">
      {/* ── Create Client ── */}
      <section className="admin-card">
        <h2 className="admin-card-title">Add Client</h2>
        <p className="admin-desc">
          Create a client portal. After creating, generate an invite link and send it to the client — they'll set up their profile and access their dedicated portal.
        </p>
        <form onSubmit={handleCreateClient} className="admin-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="admin-label">
              Name *
              <input
                type="text"
                className="modal-field"
                placeholder="e.g. Columbus Real Estate"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <label className="admin-label">
              Email *
              <input
                type="email"
                className="modal-field"
                placeholder="client@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <label className="admin-label">
              Company
              <input
                type="text"
                className="modal-field"
                placeholder="Company name (optional)"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="admin-label">
              Notes
              <input
                type="text"
                className="modal-field"
                placeholder="Internal notes (optional)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Client Portal'}
            </button>
            {createError && <span className="admin-import-msg err">{createError}</span>}
          </div>
        </form>
      </section>

      {/* ── Client List ── */}
      <section className="admin-card">
        <h2 className="admin-card-title">Client Portals</h2>

        {loading && <p className="admin-desc">Loading clients…</p>}
        {error && (
          <div className="admin-card admin-card-warning" style={{ margin: 0 }}>
            <strong>Error:</strong> {error}
            <br />
            <small>Make sure SQL migrations 003–005 are run in Supabase Dashboard.</small>
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <p className="admin-desc" style={{ color: 'var(--ds-text-muted)' }}>
            No clients yet. Create your first one above.
          </p>
        )}

        {clients.map((client) => {
          const isOpen = expandedClient === client.id;
          const clientInvites = invites[client.id] ?? [];
          const pendingInvites = clientInvites.filter((i) => i.status === 'pending' && !isExpired(i.expires_at));

          return (
            <div
              key={client.id}
              style={{
                background: 'var(--ds-bg-elevated, rgba(255,255,255,0.03))',
                border: '1px solid var(--ds-border-default, rgba(148,163,184,0.12))',
                borderRadius: '10px',
                marginBottom: '10px',
                overflow: 'hidden',
              }}
            >
              {/* Client header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
                onClick={() => toggleExpand(client.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleExpand(client.id)}
                aria-expanded={isOpen}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: 'var(--ds-cyan, #38bdf8)',
                  flexShrink: 0,
                }}>
                  {client.name.slice(0, 1).toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ds-text-primary, #f1f5f9)' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary, #94a3b8)', marginTop: '2px' }}>
                    {client.company ? `${client.company} · ` : ''}{client.email}
                  </div>
                </div>
                {/* Badges */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {pendingInvites.length > 0 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '999px', fontSize: '11px',
                      background: 'rgba(234,179,8,0.12)', color: '#eab308',
                      border: '1px solid rgba(234,179,8,0.25)',
                    }}>
                      {pendingInvites.length} pending invite{pendingInvites.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ color: 'var(--ds-text-muted, #64748b)', fontSize: '18px' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded section */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))', padding: '16px' }}>
                  {/* Generate invite */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-secondary, #94a3b8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Generate Invite Link
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="modal-field"
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                        value={inviteRole[client.id] ?? 'owner'}
                        onChange={(e) => setInviteRole((prev) => ({ ...prev, [client.id]: e.target.value as 'owner' | 'contributor' | 'accountant' }))}
                      >
                        <option value="owner">Owner</option>
                        <option value="contributor">Contributor</option>
                        <option value="accountant">Accountant</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                        disabled={generatingFor === client.id}
                        onClick={() => void generateInvite(client.id)}
                      >
                        {generatingFor === client.id ? 'Generating…' : '+ Generate Link'}
                      </button>
                    </div>
                  </div>

                  {/* Invite list */}
                  {clientInvites.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-secondary, #94a3b8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Invite Links
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {clientInvites.map((inv) => {
                          const expired = isExpired(inv.expires_at);
                          const statusColor = inv.status === 'accepted' ? '#22c55e'
                            : inv.status === 'revoked' || expired ? '#ef4444'
                            : '#eab308';
                          const statusLabel = inv.status === 'accepted' ? 'Accepted'
                            : inv.status === 'revoked' ? 'Revoked'
                            : expired ? 'Expired'
                            : 'Pending';

                          return (
                            <div key={inv.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px', padding: '8px 12px',
                            }}>
                              {/* Role chip */}
                              <span style={{
                                padding: '2px 8px', borderRadius: '999px', fontSize: '11px',
                                background: 'rgba(56,189,248,0.1)', color: 'var(--ds-cyan, #38bdf8)',
                                border: '1px solid rgba(56,189,248,0.2)', flexShrink: 0,
                              }}>
                                {roleLabels[inv.role]}
                              </span>
                              {/* URL */}
                              <code style={{
                                flex: 1, minWidth: 0, fontSize: '11px',
                                color: 'var(--ds-text-secondary, #94a3b8)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {getInviteUrl(inv.token)}
                              </code>
                              {/* Status */}
                              <span style={{ fontSize: '11px', color: statusColor, flexShrink: 0 }}>
                                {statusLabel}
                              </span>
                              {/* Actions */}
                              {inv.status === 'pending' && !expired && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '3px 10px', fontSize: '11px', flexShrink: 0 }}
                                    onClick={() => copyInviteLink(inv.token)}
                                  >
                                    {copiedToken === inv.token ? '✓ Copied' : 'Copy'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '3px 10px', fontSize: '11px', flexShrink: 0, color: '#ef4444' }}
                                    onClick={() => void revokeInvite(inv.id, client.id)}
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Portal preview + notes */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* View as Client — sets override in sessionStorage then opens /portal */}
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                        onClick={() => {
                          sessionStorage.setItem('portal_client_override', client.id);
                          window.open('/portal', '_blank');
                        }}
                      >
                        👁 View as Client
                      </button>
                      <a
                        href={`/portal/${invites[client.id]?.[0]?.token ?? ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--ds-cyan, #38bdf8)', textDecoration: 'none' }}
                      >
                        Open Invite Page →
                      </a>
                    </div>
                    {client.notes && (
                      <p style={{ fontSize: '12px', color: 'var(--ds-text-muted, #64748b)', marginTop: '8px' }}>
                        📝 {client.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Quick stats */}
      {!loading && !error && clients.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 16px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '8px', fontSize: '13px' }}>
            <span style={{ fontWeight: 700, color: 'var(--ds-cyan, #38bdf8)', marginRight: '6px' }}>{clients.length}</span>
            <span style={{ color: 'var(--ds-text-secondary, #94a3b8)' }}>Active Clients</span>
          </div>
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '13px' }}>
            <span style={{ fontWeight: 700, color: '#22c55e', marginRight: '6px' }}>
              {Object.values(invites).flat().filter(i => i.status === 'accepted').length}
            </span>
            <span style={{ color: 'var(--ds-text-secondary, #94a3b8)' }}>Accepted Invites</span>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_LABELS: Record<AdminPageId, string> = {
  api: 'API & transfer',
  users: 'For users',
  clients: 'Client Portals',
  profiles: 'Browser Profiles',
  dashboard: 'Dashboard',
  projects: 'Projects',
  deliverables: 'Deliverables',
  usage: 'Usage',
  billing: 'Billing',
  settings: 'Settings',
};

const STORAGE_GOOGLE = 'buildor_google_api';
const STORAGE_GITHUB = 'buildor_github_api';
const STORAGE_PAYPAL = 'buildor_paypal_api';

function getStoredGoogle(): { clientId: string; clientSecret: string } {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_GOOGLE) : null;
    if (!raw) return { clientId: '', clientSecret: '' };
    const o = JSON.parse(raw) as { clientId?: string; clientSecret?: string };
    return { clientId: o?.clientId ?? '', clientSecret: o?.clientSecret ?? '' };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

function getStoredGitHub(): { clientId: string; clientSecret: string } {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_GITHUB) : null;
    if (!raw) return { clientId: '', clientSecret: '' };
    const o = JSON.parse(raw) as { clientId?: string; clientSecret?: string };
    return { clientId: o?.clientId ?? '', clientSecret: o?.clientSecret ?? '' };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

function getStoredPayPal(): { clientId: string; clientSecret: string; mode: 'sandbox' | 'live' } {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PAYPAL) : null;
    if (!raw) return { clientId: '', clientSecret: '', mode: 'sandbox' };
    const o = JSON.parse(raw) as { clientId?: string; clientSecret?: string; mode?: string };
    return {
      clientId: o?.clientId ?? '',
      clientSecret: o?.clientSecret ?? '',
      mode: o?.mode === 'live' ? 'live' : 'sandbox',
    };
  } catch {
    return { clientId: '', clientSecret: '', mode: 'sandbox' };
  }
}

// ─── Project Members (RBAC) ──────────────────────────────────────────────────

interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'maintainer' | 'contributor' | 'viewer';
  granted_at: string;
  project_name?: string;
  user_email?: string;
}

function AdminProjectMembers({ userId }: { userId: string }): JSX.Element {
  const [members, setMembers] = useState<ProjectMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = getSupabaseClient() as AnySupabase | null;
      if (!client) { setLoading(false); return; }
      // Fetch project memberships for this user, join project name
      const { data, error } = await client
        .from('project_members')
        .select('id, project_id, user_id, role, granted_at, projects(name)')
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });
      if (!cancelled) {
        if (data) {
          setMembers(data.map((m: Record<string, unknown>) => ({
            ...m,
            project_name: (m.projects as Record<string, string> | null)?.name ?? 'Unknown',
          })) as ProjectMemberRow[]);
        }
        if (error) console.error('[ProjectMembers] Fetch error:', error);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const ROLE_COLORS: Record<string, string> = {
    owner: '#f59e0b',
    maintainer: '#8b5cf6',
    contributor: '#57c3ff',
    viewer: '#64748b',
  };

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="admin-card-title">Project Memberships</h2>
        <button onClick={() => setExpanded(!expanded)} style={{
          fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer',
        }}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading memberships...</p>
          ) : members.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>
              No project memberships yet. When you create projects, your membership will appear here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 6,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>
                      {m.project_name}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', marginTop: 2 }}>
                      Joined {new Date(m.granted_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${ROLE_COLORS[m.role] || '#64748b'}14`,
                    color: ROLE_COLORS[m.role] || '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="admin-desc" style={{ marginTop: 8, fontSize: 9 }}>
            Roles: <strong>owner</strong> (full control) &gt; <strong>maintainer</strong> (read/write/exec, approve) &gt; <strong>contributor</strong> (read/write, submit) &gt; <strong>viewer</strong> (read-only)
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Audit Log Viewer ────────────────────────────────────────────────────────

interface AuditEventRow {
  event_id: string;
  trace_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  outcome: string;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function AdminAuditLog({ userId, traceId }: { userId: string; traceId: string }): JSX.Element {
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'user' | 'trace'>('user');

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const client = getSupabaseClient() as AnySupabase | null;
      if (!client) { setLoading(false); return; }
      let query = client
        .from('audit_events')
        .select('event_id, trace_id, action, target_type, target_id, outcome, confidence, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterMode === 'trace' && traceId) {
        query = query.eq('trace_id', traceId);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!cancelled) {
        if (data) setEvents(data as AuditEventRow[]);
        if (error) console.error('[AuditLog] Fetch error:', error);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [expanded, filterMode, userId, traceId]);

  const OUTCOME_COLORS: Record<string, string> = {
    success: '#22c55e',
    failure: '#ef4444',
    denied: '#f59e0b',
    error: '#ef4444',
  };

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="admin-card-title">Audit Log</h2>
        <button onClick={() => setExpanded(!expanded)} style={{
          fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer',
        }}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {/* Filter toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['user', 'trace'] as const).map(mode => (
              <button key={mode} onClick={() => setFilterMode(mode)} style={{
                fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                background: filterMode === mode ? 'rgba(87,195,255,0.08)' : 'transparent',
                border: `1px solid ${filterMode === mode ? 'rgba(87,195,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: filterMode === mode ? 'var(--accent, #57c3ff)' : 'var(--text-tertiary, #64748b)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
                By {mode === 'user' ? 'User ID' : 'Trace ID'}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>Loading events...</p>
          ) : events.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>
              No audit events yet. Actions you take will be logged here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {events.map(e => (
                <div key={e.event_id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 5,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)',
                  fontSize: 11,
                }}>
                  {/* Outcome dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: OUTCOME_COLORS[e.outcome] || '#64748b',
                  }} />
                  {/* Action */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary, #e2e8f0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }}>
                      {e.action}
                    </span>
                    {e.target_type && (
                      <span style={{ color: 'var(--text-tertiary, #64748b)', marginLeft: 6, fontSize: 9 }}>
                        {e.target_type}{e.target_id ? `:${e.target_id.slice(0, 8)}` : ''}
                      </span>
                    )}
                    {e.confidence !== null && (
                      <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 9 }}>
                        AI:{Math.round(e.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {/* Timestamp */}
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, monospace)' }}>
                    {new Date(e.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="admin-desc" style={{ marginTop: 8, fontSize: 9 }}>
            Immutable log. No events can be edited or deleted. Filter by Trace ID for full session replay across devices.
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Profile Settings (inline edit) ──────────────────────────────────────────

function AdminProfileSettings({ user }: { user: import('../context/AuthContext').User }): JSX.Element {
  const { refreshProfile } = useAuth();
  const [editName, setEditName] = useState(user.displayName || '');
  const [editAccountType, setEditAccountType] = useState(user.accountType);
  const [editPlan, setEditPlan] = useState(user.plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = editName !== (user.displayName || '') || editAccountType !== user.accountType || editPlan !== user.plan;

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = getSupabaseClient() as AnySupabase | null;
      if (client) {
        const { error } = await client
          .from('profiles')
          .update({
            display_name: editName.trim() || null,
            account_type: editAccountType,
            plan: editPlan,
          })
          .eq('id', user.id);
        if (error) console.error('[ProfileSettings] Save error:', error);
        else {
          await refreshProfile();
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch (err) {
      console.error('[ProfileSettings] Error:', err);
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13,
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, color: 'var(--text-primary, #e2e8f0)', outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary, #64748b)',
    textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4,
  };

  const ACCOUNT_OPTS: { id: import('../context/AuthContext').AccountType; label: string; color: string }[] = [
    { id: 'personal', label: 'Personal', color: '#22c55e' },
    { id: 'agency', label: 'Agency', color: '#8b5cf6' },
    { id: 'enterprise', label: 'Enterprise', color: '#f59e0b' },
  ];

  const PLAN_OPTS: { id: import('../context/AuthContext').PlanType; label: string; price: string }[] = [
    { id: 'free', label: 'Free', price: '$0' },
    { id: 'pro', label: 'Pro', price: '$19/mo' },
    { id: 'team', label: 'Team', price: '$49/mo' },
  ];

  return (
    <section className="admin-card" style={{ marginTop: 12 }}>
      <h2 className="admin-card-title">Profile Settings</h2>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Display Name */}
        <div>
          <label style={labelStyle}>Display Name</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={user.email.split('@')[0]} style={inputStyle} />
        </div>

        {/* Account Type */}
        <div>
          <label style={labelStyle}>Account Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCOUNT_OPTS.map(a => (
              <button key={a.id} onClick={() => setEditAccountType(a.id)} style={{
                flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600,
                background: editAccountType === a.id ? `${a.color}14` : 'transparent',
                border: `1px solid ${editAccountType === a.id ? a.color + '50' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6, cursor: 'pointer',
                color: editAccountType === a.id ? a.color : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s',
              }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan */}
        <div>
          <label style={labelStyle}>Plan</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {PLAN_OPTS.map(p => (
              <button key={p.id} onClick={() => setEditPlan(p.id)} style={{
                flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600, textAlign: 'center',
                background: editPlan === p.id ? 'rgba(87,195,255,0.06)' : 'transparent',
                border: `1px solid ${editPlan === p.id ? 'rgba(87,195,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6, cursor: 'pointer',
                color: editPlan === p.id ? 'var(--accent, #57c3ff)' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s',
              }}>
                {p.label} <span style={{ fontSize: 9, opacity: 0.6 }}>{p.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{
              padding: '7px 18px', fontSize: 11, fontWeight: 700,
              background: dirty ? 'var(--accent, #57c3ff)' : 'rgba(255,255,255,0.04)',
              border: 'none', borderRadius: 6,
              color: dirty ? '#070b14' : 'rgba(255,255,255,0.2)',
              cursor: dirty && !saving ? 'pointer' : 'default',
              opacity: saving ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Saved!</span>}
        </div>
      </div>
    </section>
  );
}

export function AdminPage(): JSX.Element {
  const { user, isLoggedIn, isLoading, logout } = useAuth();

  // Redirect to onboarding if user hasn't completed it (wait for profile to load first)
  if (!isLoading && isLoggedIn && user && !user.onboardingCompleted && user.provider !== 'dev') {
    return <Navigate to="/onboarding" replace />;
  }
  const [savedSupabase, setSavedSupabase] = useState(false);
  const [savedGoogle, setSavedGoogle] = useState(false);
  const [savedGitHub, setSavedGitHub] = useState(false);
  const [savedPayPal, setSavedPayPal] = useState(false);
  const [config, setConfig] = useState(() => getStoredSupabaseConfig());
  const [googleApi, setGoogleApi] = useState(getStoredGoogle);
  const [githubApi, setGithubApi] = useState(getStoredGitHub);
  const [paypalApi, setPaypalApi] = useState(getStoredPayPal);
  const [page, setPage] = useState<AdminPageId>('api');
  const [showMock, setShowMock] = useState(() => {
    try {
      return localStorage.getItem(MOCK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [importJson, setImportJson] = useState('');
  const [importMessage, setImportMessage] = useState<'ok' | 'error' | null>(null);
  const [importErrorDetail, setImportErrorDetail] = useState('');
  const [exportMessage, setExportMessage] = useState(false);
  const isOwner = Boolean(
    user &&
    (user.provider === 'dev' ||
      user.email === 'dev@buildor.local' ||
      user.provider === 'google' ||
      user.provider === 'github')
  );

  // Initial load from localStorage
  useEffect(() => {
    setConfig(getStoredSupabaseConfig());
    setGoogleApi(getStoredGoogle());
    setGithubApi(getStoredGitHub());
    setPaypalApi(getStoredPayPal());
  }, []);

  // When showing API & transfer, load from DB (single source of truth) and override state
  useEffect(() => {
    if (page !== 'api') return;
    let cancelled = false;
    (async () => {
      const db = await fetchAppConfig();
      if (cancelled) return;
      if (Object.keys(db).length > 0) {
        setConfig((c) => ({
          url: db.supabase_url ?? c.url,
          anonKey: db.supabase_anon_key ?? c.anonKey,
        }));
        setGoogleApi((g) => ({
          clientId: db.google_client_id ?? g.clientId,
          clientSecret: db.google_client_secret ?? g.clientSecret,
        }));
        setGithubApi((gh) => ({
          clientId: db.github_client_id ?? gh.clientId,
          clientSecret: db.github_client_secret ?? gh.clientSecret,
        }));
        setPaypalApi((pp) => ({
          clientId: db.paypal_client_id ?? pp.clientId,
          clientSecret: db.paypal_client_secret ?? pp.clientSecret,
          mode: (db.paypal_mode === 'live' ? 'live' : db.paypal_mode === 'sandbox' ? 'sandbox' : pp.mode),
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const toggleShowMock = (): void => {
    setShowMock((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MOCK_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // When not owner, do not force "Za korisnike" — keep "API & transfer" visible so user can Import in new browser

  const handleSaveSupabase = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const url = config.url.trim();
    const anonKey = config.anonKey.trim();
    await saveAppConfig({ supabase_url: url, supabase_anon_key: anonKey });
    setStoredSupabaseConfig(url, anonKey);
    setSavedSupabase(true);
    setTimeout(() => window.location.reload(), 1800);
  };

  const handleSaveGoogle = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const clientId = googleApi.clientId.trim();
    const clientSecret = googleApi.clientSecret.trim();
    await saveAppConfig({ google_client_id: clientId, google_client_secret: clientSecret });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_GOOGLE, JSON.stringify({ clientId, clientSecret }));
    }
    setSavedGoogle(true);
    setTimeout(() => setSavedGoogle(false), 3000);
  };

  const handleSaveGitHub = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const clientId = githubApi.clientId.trim();
    const clientSecret = githubApi.clientSecret.trim();
    await saveAppConfig({ github_client_id: clientId, github_client_secret: clientSecret });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_GITHUB, JSON.stringify({ clientId, clientSecret }));
    }
    setSavedGitHub(true);
    setTimeout(() => setSavedGitHub(false), 3000);
  };

  const handleSavePayPal = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const clientId = paypalApi.clientId.trim();
    const clientSecret = paypalApi.clientSecret.trim();
    const mode = paypalApi.mode;
    await saveAppConfig({ paypal_client_id: clientId, paypal_client_secret: clientSecret, paypal_mode: mode });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PAYPAL, JSON.stringify({ clientId, clientSecret, mode }));
    }
    setSavedPayPal(true);
    setTimeout(() => setSavedPayPal(false), 3000);
  };

  const exportConfig = (): void => {
    const supabase = getStoredSupabaseConfig();
    const google = getStoredGoogle();
    const github = getStoredGitHub();
    const paypal = getStoredPayPal();
    const payload = {
      supabase: { url: supabase.url, anonKey: supabase.anonKey },
      google: { clientId: google.clientId, clientSecret: google.clientSecret },
      github: { clientId: github.clientId, clientSecret: github.clientSecret },
      paypal: { clientId: paypal.clientId, clientSecret: paypal.clientSecret, mode: paypal.mode },
    };
    const json = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(() => {
        setExportMessage(true);
        setTimeout(() => setExportMessage(false), 2500);
      });
    } else {
      setImportJson(json);
    }
  };

  const importConfig = (): void => {
    let raw = importJson
      .replace(/^\uFEFF/, '')
      .replace(/\u200B|\u200C|\u200D|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
      .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
      .trim();
    if (!raw) {
      setImportMessage('error');
      setImportErrorDetail('Paste the JSON first.');
      return;
    }
    try {
      const data = JSON.parse(raw) as {
        supabase?: { url?: string; anonKey?: string; anon_key?: string };
        google?: { clientId?: string; clientSecret?: string };
        github?: { clientId?: string; clientSecret?: string };
        paypal?: { clientId?: string; clientSecret?: string; mode?: string };
      };
      const anonKey = data.supabase?.anonKey ?? data.supabase?.anon_key ?? '';
      if (data.supabase?.url && anonKey) {
        setStoredSupabaseConfig(data.supabase.url, anonKey);
        setConfig({ url: data.supabase.url, anonKey });
      }
      if (data.google) {
        const g = { clientId: String(data.google.clientId ?? ''), clientSecret: String(data.google.clientSecret ?? '') };
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_GOOGLE, JSON.stringify(g));
        setGoogleApi(g);
      }
      if (data.github) {
        const gh = { clientId: String(data.github.clientId ?? ''), clientSecret: String(data.github.clientSecret ?? '') };
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_GITHUB, JSON.stringify(gh));
        setGithubApi(gh);
      }
      if (data.paypal) {
        const pp = {
          clientId: String(data.paypal.clientId ?? ''),
          clientSecret: String(data.paypal.clientSecret ?? ''),
          mode: data.paypal.mode === 'live' ? 'live' : 'sandbox' as 'sandbox' | 'live',
        };
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_PAYPAL, JSON.stringify(pp));
        setPaypalApi(pp);
      }
      setImportJson('');
      setImportMessage('ok');
      setImportErrorDetail('');
      setTimeout(() => setImportMessage(null), 3000);
    } catch (e) {
      setImportMessage('error');
      setImportErrorDetail(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const isMockPage = page !== 'api' && page !== 'users' && page !== 'clients';

  return (
    <div className="admin-app app">
      <header className="topbar">
        <Link to="/" className="topbar-logo">
          <img src="/buildor-logo.svg" alt="Buildor" className="topbar-logo-img" />
          <span className="topbar-logo-name">Buildor</span>
          <span className="topbar-logo-tag">Admin</span>
        </Link>
        <div className="topbar-center">
          <nav className="breadcrumb">
            <span className="bc-sep">Admin</span>
            <span className="bc-current">{PAGE_LABELS[page]}</span>
          </nav>
        </div>
        <div className="topbar-actions">
          <input className="topbar-search" type="text" placeholder="Search..." readOnly aria-label="Search" />
          <div className="toggle-row">
            <span className="toggle-info">Show mock</span>
            <label className="toggle" title="Show mock content">
              <input
                type="checkbox"
                checked={showMock}
                onChange={toggleShowMock}
                aria-label="Show mock content"
              />
              <span className="toggle-track" aria-hidden />
              <span className="toggle-thumb" aria-hidden />
            </label>
          </div>
          {isLoggedIn ? (
            <>
              <Link to="/" className="btn-g">
                Home
              </Link>
              <button
                type="button"
                className="btn-g"
                onClick={() => {
                  logout();
                  window.location.href = '/';
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/" className="btn-g">
              ← Home
            </Link>
          )}
          <Link to="/checkout" className="btn-g" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
            🛒 Test Checkout
          </Link>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="nav-section">
            <div className="nav-label">Real</div>
            <button
              type="button"
              className={`nav-item ${page === 'api' ? 'active' : ''}`}
              onClick={() => setPage('api')}
            >
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
                </svg>
              </span>
              API &amp; transfer
            </button>
            <button
              type="button"
              className={`nav-item ${page === 'users' ? 'active' : ''}`}
              onClick={() => setPage('users')}
            >
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              For users
            </button>
            <button
              type="button"
              className={`nav-item ${page === 'clients' ? 'active' : ''}`}
              onClick={() => setPage('clients')}
            >
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
              </span>
              Client Portals
            </button>
            <button
              type="button"
              className={`nav-item ${page === 'profiles' ? 'active' : ''}`}
              onClick={() => setPage('profiles')}
            >
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  <path d="M16 4l2 2-2 2" />
                </svg>
              </span>
              Browser Profiles
            </button>
          </div>
          {/* Profile Switcher */}
          {isLoggedIn && (
            <div style={{ padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 16px 2px' }}>
                Active Profile
              </div>
              <ProfileSwitcher onNavigateToProfiles={() => setPage('profiles')} />
            </div>
          )}
          {showMock && (
            <div className="nav-section">
              <div className="nav-label">Demo</div>
              {(['dashboard', 'projects', 'deliverables', 'usage', 'billing', 'settings'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`nav-item ${page === id ? 'active' : ''}`}
                  onClick={() => setPage(id)}
                >
                  <span className="nav-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </span>
                  {PAGE_LABELS[id]}
                  <span className="nav-badge demo">Demo</span>
                </button>
              ))}
            </div>
          )}
          <div className="sidebar-footer">
            <div className="avatar" aria-hidden>
              {user?.email?.slice(0, 1).toUpperCase() ?? '?'}
            </div>
            <div className="avatar-info">
              <div className="avatar-name">{user?.email ?? 'Not signed in'}</div>
              <div className="avatar-role">{isOwner ? 'Owner' : 'User'}</div>
            </div>
          </div>
        </aside>

        <div className="main">
          <ProfileColorBanner />
          <div className="content">
            <div className={`page ${page === 'api' ? 'active' : ''}`}>
          <div className="admin-panel admin-panel-me">
            {!isLoggedIn && (
              <p className="admin-desc">
                API settings (Supabase) are available without signing in. For Google/GitHub config and “Owner” access, sign in via <strong>Dev login</strong> or, once OAuth is set up, via <strong>Google</strong> / <strong>GitHub</strong> — then you no longer need Dev login.
              </p>
            )}

            <section className="admin-card admin-card-export">
              <h2 className="admin-card-title">Transfer settings between browsers</h2>
              <div className="admin-all-browsers-box">
                <strong>Config is stored in the database</strong>
                <p>When you click Save, values are saved to the Supabase table <code>app_config</code>. Every browser that opens Admin will load the same config from the DB. Run the migration <code>supabase/migrations/002_app_config.sql</code> in Supabase SQL Editor once to create the table.</p>
              </div>
              <p className="admin-desc">
                For first-time setup without DB: use <strong>.env</strong> (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and run <code>npm run dev</code>. Or <strong>Export</strong> (copy JSON) in one browser and <strong>Import</strong> (paste below) in another.
              </p>
              <div className="admin-export-row">
                <button type="button" className="btn btn-ghost" onClick={exportConfig}>
                  Export (copy JSON)
                </button>
                {exportMessage && <span className="admin-import-msg ok">Copied to clipboard.</span>}
              </div>
              <div className="admin-import-row">
                <textarea
                  className="admin-import-textarea"
                  placeholder="Paste JSON from Export here (in the other browser)"
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={4}
                />
                <button type="button" className="btn btn-primary" onClick={importConfig}>
                  Import
                </button>
                {importMessage === 'ok' && <span className="admin-import-msg ok">Imported. Refresh the page (F5) to apply Supabase.</span>}
                {importMessage === 'error' && (
                  <span className="admin-import-msg err">
                    Invalid JSON. Paste the full Export. {importErrorDetail && `(${importErrorDetail})`}
                  </span>
                )}
              </div>
            </section>

            {/* Supabase – always visible (so someone can configure without signing in) */}
            <section className="admin-card">
              <h2 className="admin-card-title">Supabase API</h2>
              <p className="admin-card-link">
                Where to create project and keys:{' '}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  supabase.com/dashboard
                </a>
                {' '}→ select project → <strong>Settings → API</strong> (Project URL + anon key).
              </p>
              <p className="admin-desc">
                Save Project URL and anon key here or in .env.
              </p>
              <form onSubmit={handleSaveSupabase} className="admin-form">
                <label className="admin-label">
                  Project URL
                  <input
                    type="url"
                    className="modal-field"
                    placeholder="https://xxxxx.supabase.co"
                    value={config.url}
                    onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label className="admin-label">
                  Anon key
                  <input
                    type="password"
                    className="modal-field"
                    placeholder="eyJ... or sb_publishable_..."
                    value={config.anonKey}
                    onChange={(e) => setConfig((c) => ({ ...c, anonKey: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <button type="submit" className="btn btn-primary">Save</button>
                {savedSupabase && (
                  <p className="admin-saved">Saved. The page will refresh.</p>
                )}
                {isSupabaseConfigured() && (
                  <p className="admin-desc" style={{ marginTop: '0.75rem', color: 'var(--ds-green)' }}>
                    Supabase is configured.
                  </p>
                )}
              </form>
            </section>

            {/* Google & GitHub OAuth — enable in Supabase first */}
            <div className="admin-card admin-card-warning">
              <strong>Blank page or “provider is not enabled”</strong>
              <p>If you see a <strong>blank page</strong> at the Supabase authorize URL, or “provider is not enabled”:</p>
              <ol className="admin-list">
                <li>Open <a href="https://supabase.com/dashboard/project/beukajxqbpafunxkhrqd/auth/providers" target="_blank" rel="noopener noreferrer">Supabase → Authentication → Providers</a>.</li>
                <li><strong>Google:</strong> Turn on “Google”, paste Client ID and Client Secret (from Google Cloud Console), Save.</li>
                <li><strong>GitHub:</strong> Turn on “GitHub”, paste Client ID and Client Secret (from GitHub OAuth App), Save.</li>
                <li>Open <a href="https://supabase.com/dashboard/project/beukajxqbpafunxkhrqd/auth/url-configuration" target="_blank" rel="noopener noreferrer">Authentication → URL Configuration</a>. Add this to <strong>Redirect URLs</strong>: <code>{typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3027/auth/callback'}</code> Set <strong>Site URL</strong> to <code>{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3027'}</code></li>
                <li>In <strong>Google Cloud Console</strong> → Credentials → your OAuth 2.0 Client ID → <strong>Authorized redirect URIs</strong> add exactly: <code>https://beukajxqbpafunxkhrqd.supabase.co/auth/v1/callback</code> (no trailing slash).</li>
              </ol>
              <p>Supabase callback (use this in Google/GitHub as redirect URI): <code>https://beukajxqbpafunxkhrqd.supabase.co/auth/v1/callback</code></p>
            </div>

            <section className="admin-card">
              <h2 className="admin-card-title">Google API (OAuth)</h2>
              <p className="admin-card-link">
                Where to create keys:{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                  Google Cloud Console → Credentials
                </a>
                {' '}→ Create Credentials → OAuth client ID (Web application). Callback URL: <code>https://[PROJECT_REF].supabase.co/auth/v1/callback</code>. Then enter Client ID and Secret in Supabase: Authentication → Providers → Google.
              </p>
              <p className="admin-desc">
                Optionally save here; otherwise enter them in Supabase Dashboard → Authentication → Providers → Google.
              </p>
              <p className="admin-save-hint">
                Be sure to click <strong>Save</strong> below — otherwise after refresh the fields will be empty.
              </p>
              <form onSubmit={handleSaveGoogle} className="admin-form">
                <label className="admin-label">
                  Client ID
                  <input
                    type="text"
                    className="modal-field"
                    placeholder="xxxx.apps.googleusercontent.com"
                    value={googleApi.clientId}
                    onChange={(e) => setGoogleApi((c) => ({ ...c, clientId: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label className="admin-label">
                  Client Secret
                  <input
                    type="password"
                    className="modal-field"
                    placeholder="GOCSPX-..."
                    value={googleApi.clientSecret}
                    onChange={(e) => setGoogleApi((c) => ({ ...c, clientSecret: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <button type="submit" className="btn btn-primary">Save</button>
                {savedGoogle && <p className="admin-saved">Saved.</p>}
              </form>
            </section>

            <section className="admin-card">
              <h2 className="admin-card-title">GitHub API (OAuth)</h2>
              <p className="admin-card-link">
                Where to create keys:{' '}
                <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer">
                  GitHub → Settings → Developer settings → OAuth Apps
                </a>
                {' '}→ New OAuth App. Authorization callback URL: <code>https://[PROJECT_REF].supabase.co/auth/v1/callback</code>. Then enter Client ID and Secret in Supabase: Authentication → Providers → GitHub.
              </p>
              <p className="admin-desc">
                Optionally save here; otherwise enter them in Supabase Dashboard → Authentication → Providers → GitHub.
              </p>
              <p className="admin-save-hint">
                Be sure to click <strong>Save</strong> below — otherwise after refresh the fields will be empty.
              </p>
              <form onSubmit={handleSaveGitHub} className="admin-form">
                <label className="admin-label">
                  Client ID
                  <input
                    type="text"
                    className="modal-field"
                    placeholder="Ovide..."
                    value={githubApi.clientId}
                    onChange={(e) => setGithubApi((c) => ({ ...c, clientId: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label className="admin-label">
                  Client Secret
                  <input
                    type="password"
                    className="modal-field"
                    placeholder="..."
                    value={githubApi.clientSecret}
                    onChange={(e) => setGithubApi((c) => ({ ...c, clientSecret: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <button type="submit" className="btn btn-primary">Save</button>
                {savedGitHub && <p className="admin-saved">Saved.</p>}
              </form>
            </section>

            {/* ── PayPal ── */}
            <section className="admin-card">
              <h2 className="admin-card-title">PayPal API (Checkout)</h2>
              <p className="admin-card-link">
                Where to create keys:{' '}
                <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer">
                  developer.paypal.com → My Apps &amp; Credentials
                </a>
                {' '}→ Create App → Merchant → copy <strong>Client ID</strong> and <strong>Secret key</strong>.
              </p>
              <p className="admin-desc">
                Used for card checkout on <code>/checkout</code> — customers pay by card without a PayPal account.
              </p>
              <p className="admin-save-hint">
                Be sure to click <strong>Save</strong> — values are stored in database and persist across browsers.
              </p>
              <form onSubmit={handleSavePayPal} className="admin-form">
                <label className="admin-label">
                  Client ID
                  <input
                    type="text"
                    className="modal-field"
                    placeholder="AXnSL..."
                    value={paypalApi.clientId}
                    onChange={(e) => setPaypalApi((c) => ({ ...c, clientId: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label className="admin-label">
                  Secret Key
                  <input
                    type="password"
                    className="modal-field"
                    placeholder="EGkB..."
                    value={paypalApi.clientSecret}
                    onChange={(e) => setPaypalApi((c) => ({ ...c, clientSecret: e.target.value }))}
                    autoComplete="off"
                  />
                </label>
                <label className="admin-label">
                  Mode
                  <select
                    className="modal-field"
                    value={paypalApi.mode}
                    onChange={(e) => setPaypalApi((c) => ({ ...c, mode: e.target.value as 'sandbox' | 'live' }))}
                  >
                    <option value="sandbox">Sandbox (testing)</option>
                    <option value="live">Live (production)</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary">Save</button>
                {savedPayPal && <p className="admin-saved">Saved. PayPal credentials stored in database.</p>}
                {paypalApi.clientId && (
                  <p className="admin-desc" style={{ marginTop: '0.75rem', color: 'var(--ds-green)' }}>
                    PayPal is configured ({paypalApi.mode} mode). <a href="/checkout" target="_blank" rel="noopener noreferrer">Open checkout →</a>
                  </p>
                )}
              </form>
            </section>
          </div>
            </div>

            <div className={`page ${page === 'users' ? 'active' : ''}`}>
              <div className="admin-panel admin-panel-users">
                {!isLoading && isLoggedIn && user && (
                  <>
                    {/* Identity Card */}
                    <section className="admin-card">
                      <h2 className="admin-card-title">Identity</h2>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 12 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                          background: user.avatarUrl ? `url(${user.avatarUrl}) center/cover` : 'linear-gradient(135deg, var(--accent, #57c3ff), var(--accent-dim, #3a7bd5))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22, fontWeight: 800, color: '#fff',
                          border: '2px solid rgba(87,195,255,0.2)',
                        }}>
                          {!user.avatarUrl && (user.displayName?.[0] ?? user.email[0] ?? '?').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #e2e8f0)', marginBottom: 2 }}>
                            {user.displayName || user.email.split('@')[0]}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', marginBottom: 8 }}>
                            {user.email} {user.provider && <span style={{ opacity: 0.6 }}>via {user.provider}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: user.accountType === 'agency' ? 'rgba(139,92,246,0.12)' : user.accountType === 'enterprise' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                              color: user.accountType === 'agency' ? '#8b5cf6' : user.accountType === 'enterprise' ? '#f59e0b' : '#22c55e',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              {user.accountType}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: user.plan === 'team' ? 'rgba(87,195,255,0.12)' : user.plan === 'pro' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)',
                              color: user.plan === 'team' ? '#57c3ff' : user.plan === 'pro' ? '#f59e0b' : '#94a3b8',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              {user.plan} plan
                            </span>
                            {!user.onboardingCompleted && (
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                              }}>
                                Onboarding incomplete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Trace & Audit Info */}
                    <section className="admin-card" style={{ marginTop: 12 }}>
                      <h2 className="admin-card-title">Audit & Tracing</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>User ID</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary, #94a3b8)', wordBreak: 'break-all' }}>{user.id}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Trace ID</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary, #94a3b8)', wordBreak: 'break-all' }}>{user.traceId || 'Not assigned'}</div>
                        </div>
                      </div>
                      <p className="admin-desc" style={{ marginTop: 10, fontSize: 10 }}>
                        Trace ID is immutable and links all audit events for session replay. Every action logged with confidence score for AI-assisted operations.
                      </p>
                    </section>

                    {/* Account Type Explainer */}
                    <section className="admin-card" style={{ marginTop: 12 }}>
                      <h2 className="admin-card-title">Account Types</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                        {[
                          { type: 'personal', label: 'Personal', desc: 'Solo developer, 1 browser workspace', color: '#22c55e', active: user.accountType === 'personal' },
                          { type: 'agency', label: 'Agency / Studio', desc: 'Dev + client accounts, N browser profiles', color: '#8b5cf6', active: user.accountType === 'agency' },
                          { type: 'enterprise', label: 'Enterprise', desc: 'Teams + SSO, Custom RBAC', color: '#f59e0b', active: user.accountType === 'enterprise' },
                        ].map(t => (
                          <div key={t.type} style={{
                            padding: 10, borderRadius: 8,
                            background: t.active ? `${t.color}0a` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${t.active ? t.color + '30' : 'rgba(255,255,255,0.06)'}`,
                            opacity: t.active ? 1 : 0.5,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: t.active ? t.color : 'var(--text-secondary, #94a3b8)', marginBottom: 4 }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-tertiary, #64748b)', lineHeight: 1.4 }}>{t.desc}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Profile Settings */}
                    <AdminProfileSettings user={user} />

                    {/* Project Members (RBAC) */}
                    <AdminProjectMembers userId={user.id} />

                    {/* Audit Log */}
                    <AdminAuditLog userId={user.id} traceId={user.traceId} />
                  </>
                )}
                {!isLoading && !isLoggedIn && (
                  <section className="admin-card">
                    <h2 className="admin-card-title">Not signed in</h2>
                    <p className="admin-desc">Sign in to view your profile and identity settings.</p>
                  </section>
                )}
              </div>
            </div>

            <div className={`page ${page === 'clients' ? 'active' : ''}`}>
              <AdminClientsSection />
            </div>

            <div className={`page ${page === 'profiles' ? 'active' : ''}`}>
              <AdminProfilesPage />
            </div>

            {isMockPage && (
              <div className="page active">
                <AdminMockStatic page={page} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
