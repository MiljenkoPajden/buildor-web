/**
 * ClientPortalPage — main client portal SPA
 * Route: /portal (wrapped in PortalAuthGuard + PortalProvider)
 *
 * @features
 * - Role-based navigation (owner | contributor | accountant)
 * - Overview: stat cards, project progress bars, activity feed
 * - Projects: filter tabs, cards, expandable message thread
 * - Team: member list with role badges
 * - Finances: invoice table, payment options
 *
 * @tokens Scoped to .portal-app — all DS tokens from client-portal.css
 */

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortal } from '../context/PortalContext';
import { usePortalData, useProjectMessages } from '../hooks/usePortalData';
import type { Project, Invoice, MemberWithProfile, ActivityItem } from '../hooks/usePortalData';
import '../styles/client-portal.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  if (email) return (email[0] ?? '?').toUpperCase();
  return '?';
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function progressClass(pct: number): string {
  if (pct >= 75) return 'ok';
  if (pct >= 40) return 'warn';
  return 'danger';
}

// ── Auth Guard (exported — used in App.tsx) ────────────────────────────────────

export function PortalAuthGuard({ children }: { children: ReactNode }): JSX.Element {
  const { isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <span style={{ color: '#64748b', fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    navigate('/portal/login', { replace: true });
    return <div className="portal-loading"><div className="portal-spinner" /></div>;
  }

  return <>{children}</>;
}

// ── Section: Overview ──────────────────────────────────────────────────────────

function PortalOverview({
  projects, invoices, members, activity,
}: {
  projects: Project[];
  invoices: Invoice[];
  members: MemberWithProfile[];
  activity: ActivityItem[];
}): JSX.Element {
  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

  return (
    <>
      <div className="portal-page-header">
        <div>
          <div className="portal-page-title">Overview</div>
          <div className="portal-page-sub">Your project and billing summary</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card c">
          <div className="portal-stat-icon c">📁</div>
          <div className="portal-stat-body">
            <div className="portal-stat-value">{activeProjects.length}</div>
            <div className="portal-stat-label">Active Projects</div>
          </div>
        </div>
        <div className="portal-stat-card p">
          <div className="portal-stat-icon p">📄</div>
          <div className="portal-stat-body">
            <div className="portal-stat-value">{pendingInvoices.length}</div>
            <div className="portal-stat-label">Pending Invoices</div>
          </div>
        </div>
        <div className="portal-stat-card g">
          <div className="portal-stat-icon g">👥</div>
          <div className="portal-stat-body">
            <div className="portal-stat-value">{members.length}</div>
            <div className="portal-stat-label">Team Members</div>
          </div>
        </div>
      </div>

      <div className="portal-two-col">
        {/* Active project progress */}
        <div className="portal-panel">
          <div className="portal-panel-head">
            <span>Project Progress</span>
            <span style={{ color: 'var(--ds-cyan)', fontSize: 11 }}>{activeProjects.length} active</span>
          </div>
          <div className="portal-panel-body">
            {activeProjects.length === 0 ? (
              <div className="portal-empty">
                <div className="portal-empty-icon">📁</div>
                <div className="portal-empty-title">No active projects</div>
              </div>
            ) : (
              activeProjects.map((p) => (
                <div key={p.id} className="portal-progress-wrap" style={{ marginBottom: 16 }}>
                  <div className="portal-progress-label">
                    <span style={{ color: 'var(--ds-text)', fontWeight: 500 }}>{p.name}</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="portal-progress-bar">
                    <div
                      className={`portal-progress-fill ${progressClass(p.progress)}`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  {p.due_date && (
                    <div style={{ fontSize: 11, color: 'var(--ds-text-dim)', marginTop: 3 }}>
                      Due {new Date(p.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="portal-panel">
          <div className="portal-panel-head">Recent Activity</div>
          <div className="portal-panel-body" style={{ padding: '8px 12px' }}>
            {activity.length === 0 ? (
              <div className="portal-empty" style={{ padding: '24px 12px' }}>
                <div className="portal-empty-icon">📋</div>
                <div className="portal-empty-title">No activity yet</div>
              </div>
            ) : (
              <div className="portal-activity">
                {activity.map((item) => (
                  <div key={item.id} className="portal-act-item">
                    <div className={`portal-act-dot ${item.type.startsWith('project') ? 'project' : item.type.startsWith('invoice') ? 'invoice' : 'member'}`} />
                    <div className="portal-act-body">
                      <div className="portal-act-label">{item.label}</div>
                      <div className="portal-act-detail">{item.detail}</div>
                    </div>
                    <div className="portal-act-time">{relativeTime(item.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <div className="portal-panel">
          <div className="portal-panel-head">
            <span>Pending Invoices</span>
            <span style={{ color: 'var(--ds-yellow)', fontSize: 11 }}>{pendingInvoices.length} outstanding</span>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            <table className="portal-invoice-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvoices.slice(0, 3).map((inv) => (
                  <tr key={inv.id}>
                    <td className="td-number">{inv.invoice_number}</td>
                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td className="td-amount">{inv.currency} {Number(inv.amount_total).toFixed(2)}</td>
                    <td><span className={`portal-badge ${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── Section: Projects ──────────────────────────────────────────────────────────

type ProjectFilter = 'all' | 'active' | 'upcoming' | 'archived';

function MessageThread({ project, clientId, userId }: { project: Project; clientId: string; userId: string }): JSX.Element {
  const { messages, isLoading, send } = useProjectMessages(project.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (): Promise<void> => {
    if (!text.trim()) return;
    setSending(true);
    await send(text.trim(), userId, clientId);
    setText('');
    setSending(false);
  };

  return (
    <div className="portal-thread">
      <div style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontWeight: 600, marginBottom: 4 }}>
        COMMENTS ({messages.length})
      </div>
      {isLoading ? (
        <div style={{ color: 'var(--ds-text-dim)', fontSize: 13, padding: '8px 0' }}>Loading…</div>
      ) : messages.length === 0 ? (
        <div style={{ color: 'var(--ds-text-dim)', fontSize: 13, padding: '8px 0' }}>No comments yet. Be the first.</div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="portal-message">
            <div className="portal-msg-avatar">{initials(m.full_name, null)}</div>
            <div className="portal-msg-body">
              <div className="portal-msg-meta">
                <span className="portal-msg-name">{m.full_name ?? 'Team member'}</span>
                {' · '}{relativeTime(m.created_at)}
              </div>
              <div className="portal-msg-content">{m.content}</div>
            </div>
          </div>
        ))
      )}
      <div className="portal-thread-form">
        <textarea
          className="portal-thread-input"
          rows={1}
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
        />
        <button className="portal-thread-send" onClick={handleSend} disabled={sending || !text.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function PortalProjects({ projects, clientId, userId }: { projects: Project[]; clientId: string; userId: string }): JSX.Element {
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: { key: ProjectFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'archived', label: 'Archive' },
  ];

  const filtered = projects.filter((p) => {
    if (filter === 'all') return p.status !== 'archived';
    if (filter === 'archived') return p.status === 'archived';
    return p.status === filter;
  });

  return (
    <>
      <div className="portal-page-header">
        <div>
          <div className="portal-page-title">Projects</div>
          <div className="portal-page-sub">{projects.length} total projects</div>
        </div>
      </div>

      <div className="portal-filter-tabs">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`portal-filter-tab${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="portal-panel">
          <div className="portal-empty">
            <div className="portal-empty-icon">📁</div>
            <div className="portal-empty-title">No {filter !== 'all' ? filter : ''} projects</div>
            <div className="portal-empty-desc">Projects will appear here once created.</div>
          </div>
        </div>
      ) : (
        filtered.map((p) => {
          const isExpanded = expandedId === p.id;
          return (
            <div
              key={p.id}
              className={`portal-project-card${isExpanded ? ' expanded' : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : p.id)}
            >
              <div className="portal-project-head">
                <div className="portal-project-name">{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`portal-badge ${p.status}`}>{p.status}</span>
                  <span style={{ color: 'var(--ds-text-dim)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Progress bar */}
              {p.status !== 'upcoming' && (
                <div className="portal-progress-wrap">
                  <div className="portal-progress-label">
                    <span>Progress</span><span>{p.progress}%</span>
                  </div>
                  <div className="portal-progress-bar">
                    <div className={`portal-progress-fill ${progressClass(p.progress)}`} style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="portal-project-meta">
                {p.start_date && <span>Start: {new Date(p.start_date).toLocaleDateString()}</span>}
                {p.due_date && <span>Due: {new Date(p.due_date).toLocaleDateString()}</span>}
              </div>

              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()}>
                  {p.description && <div className="portal-project-desc">{p.description}</div>}

                  {/* Archive download */}
                  {p.archive_url && (
                    <a
                      href={p.archive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-g"
                      style={{ display: 'inline-flex', marginBottom: 12, textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📥 Download Archive
                    </a>
                  )}

                  <MessageThread project={p} clientId={clientId} userId={userId} />
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

// ── Section: Team ──────────────────────────────────────────────────────────────

function PortalTeam({ members }: { members: MemberWithProfile[] }): JSX.Element {
  return (
    <>
      <div className="portal-page-header">
        <div>
          <div className="portal-page-title">Work Team</div>
          <div className="portal-page-sub">{members.length} members with portal access</div>
        </div>
      </div>

      <div className="portal-panel">
        <div className="portal-panel-head">Team Members</div>
        <div className="portal-panel-body">
          {members.length === 0 ? (
            <div className="portal-empty">
              <div className="portal-empty-icon">👥</div>
              <div className="portal-empty-title">No team members yet</div>
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="portal-member-row">
                <div className="portal-member-avatar">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" />
                    : initials(m.full_name, m.email)
                  }
                </div>
                <div className="portal-member-info">
                  <div className="portal-member-name">{m.full_name ?? 'Team member'}</div>
                  {m.email && <div className="portal-member-email">{m.email}</div>}
                </div>
                <div>
                  <span className={`portal-role-chip ${m.role}`}>{m.role}</span>
                  <div className="portal-member-joined">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Section: Finances ──────────────────────────────────────────────────────────

function PortalFinances({ invoices }: { invoices: Invoice[] }): JSX.Element {
  const total = invoices.reduce((s, i) => s + Number(i.amount_total), 0);
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount_total), 0);

  return (
    <>
      <div className="portal-page-header">
        <div>
          <div className="portal-page-title">Finances</div>
          <div className="portal-page-sub">{invoices.length} invoices</div>
        </div>
      </div>

      {/* Summary */}
      <div className="portal-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
        <div className="portal-stat-card g">
          <div className="portal-stat-icon g">💰</div>
          <div className="portal-stat-body">
            <div className="portal-stat-value">${paid.toFixed(0)}</div>
            <div className="portal-stat-label">Total Paid</div>
          </div>
        </div>
        <div className="portal-stat-card p">
          <div className="portal-stat-icon p">📄</div>
          <div className="portal-stat-body">
            <div className="portal-stat-value">${(total - paid).toFixed(0)}</div>
            <div className="portal-stat-label">Outstanding</div>
          </div>
        </div>
      </div>

      {/* Invoice table */}
      <div className="portal-panel" style={{ marginBottom: 20 }}>
        <div className="portal-panel-head">Invoices</div>
        {invoices.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">📄</div>
            <div className="portal-empty-title">No invoices yet</div>
          </div>
        ) : (
          <table className="portal-invoice-table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="td-number">{inv.invoice_number}</td>
                  <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="td-amount">{inv.currency} {Number(inv.amount_total).toFixed(2)}</td>
                  <td><span className={`portal-badge ${inv.status}`}>{inv.status}</span></td>
                  <td>
                    {inv.pdf_url
                      ? <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-cyan)', fontSize: 12 }}>📥 PDF</a>
                      : <span style={{ color: 'var(--ds-text-dim)', fontSize: 12 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment options */}
      <div className="portal-panel">
        <div className="portal-panel-head">Payment Options</div>
        <div className="portal-panel-body">
          <div className="portal-payment-opts">
            <div className="portal-payment-card">
              <div className="portal-payment-icon">💳</div>
              <div className="portal-payment-label">Card Payment</div>
              <div className="portal-payment-desc">Visa, Mastercard, Amex</div>
            </div>
            <div className="portal-payment-card">
              <div className="portal-payment-icon">🏦</div>
              <div className="portal-payment-label">Bank Transfer</div>
              <div className="portal-payment-desc">Direct bank wire</div>
            </div>
            <div className="portal-payment-card">
              <div className="portal-payment-icon">🅿️</div>
              <div className="portal-payment-label">PayPal</div>
              <div className="portal-payment-desc">PayPal account or card</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ds-text-dim)', marginTop: 16, textAlign: 'center' }}>
            Contact your account manager to initiate a payment.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type PortalSection = 'overview' | 'projects' | 'team' | 'finances';

export function ClientPortalPage(): JSX.Element {
  const { client, role, canSeeProjects, canSeeFinances, canSeeTeam, isLoading: portalLoading, error: portalError, member } = usePortal();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { projects, invoices, members, activity, isLoading: dataLoading, error: dataError, refresh } = usePortalData(client?.id);
  const [section, setSection] = useState<PortalSection>('overview');

  // Portal loading
  if (portalLoading || dataLoading) {
    return (
      <div className="portal-loading">
        <div className="portal-spinner" />
        <span style={{ color: '#64748b', fontSize: 13 }}>Loading your portal…</span>
      </div>
    );
  }

  // No membership found
  if (!client || !member) {
    return (
      <div className="portal-loading">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>No portal access</div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
            You don't have access to any client portal yet.<br />
            Ask your account manager for an invite link.
          </div>
          <button
            onClick={() => logout().then(() => navigate('/'))}
            style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (portalError || dataError) {
    return (
      <div className="portal-loading">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 8 }}>Failed to load portal</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{portalError ?? dataError}</div>
          <button onClick={refresh} style={{ padding: '8px 20px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, color: '#38bdf8', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Nav items — filtered by role
  const navItems: { key: PortalSection; label: string; icon: string; show: boolean }[] = [
    { key: 'overview',  label: 'Overview',  icon: '◉', show: true },
    { key: 'projects',  label: 'Projects',  icon: '📁', show: canSeeProjects },
    { key: 'team',      label: 'Work Team', icon: '👥', show: canSeeTeam },
    { key: 'finances',  label: 'Finances',  icon: '💰', show: canSeeFinances },
  ];

  return (
    <div className="portal-app">
      {/* ── Topbar ── */}
      <header className="portal-topbar">
        <div className="portal-logo">
          <span className="portal-logo-name">{client.name}</span>
          <span className="portal-logo-tag">PORTAL</span>
          {client.company && <span className="portal-logo-client">· {client.company}</span>}
        </div>
        <div className="topbar-spacer" />
        <div className="portal-user">
          <span style={{ fontSize: 12, color: 'var(--ds-text-muted)' }}>{user?.email}</span>
          <div className="portal-avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" />
              : initials(user?.displayName, user?.email)
            }
          </div>
          <button
            className="btn-g"
            style={{ fontSize: 12, padding: '5px 10px' }}
            onClick={() => logout().then(() => navigate('/'))}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="portal-body">
        {/* ── Sidebar ── */}
        <aside className="portal-sidebar">
          {/* Client card */}
          <div className="portal-client-card">
            <div className="portal-client-name">{client.name}</div>
            {client.company && <div className="portal-client-company">{client.company}</div>}
            {role && <span className={`portal-role-chip ${role}`}>{role}</span>}
          </div>

          <nav className="portal-nav-section">
            <div className="portal-nav-label">Navigation</div>
            {navItems.filter((n) => n.show).map((n) => (
              <button
                key={n.key}
                className={`portal-nav-item${section === n.key ? ' active' : ''}`}
                onClick={() => setSection(n.key)}
              >
                <span className="portal-nav-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ── */}
        <main className="portal-main">
          <div className="portal-content">
            {section === 'overview' && (
              <PortalOverview projects={projects} invoices={invoices} members={members} activity={activity} />
            )}
            {section === 'projects' && canSeeProjects && (
              <PortalProjects projects={projects} clientId={client.id} userId={user?.id ?? ''} />
            )}
            {section === 'team' && canSeeTeam && (
              <PortalTeam members={members} />
            )}
            {section === 'finances' && canSeeFinances && (
              <PortalFinances invoices={invoices} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClientPortalPage;
