/**
 * Static mock content from buildor-client-admin.html template.
 * Demonstrative only — not wired to real data.
 */

import type { AdminPageId } from './AdminPage';

type MockStaticProps = { page: AdminPageId };

function ProgressBar({ width, color, label }: { width: number; color: string; label: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${width}%`, height: '100%', borderRadius: 2, background: `var(${color})` }} />
      </div>
      <span style={{ fontSize: 10, color: 'var(--ds-text-muted)' }}>{label}</span>
    </div>
  );
}

export function AdminMockStatic({ page }: MockStaticProps): JSX.Element {
  if (page === 'dashboard') {
    return (
      <>
        <div className="demo-banner">
          <strong>Demonstrative only.</strong> Static content from template — not wired to real data.
        </div>
        <div className="page-header">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-subtitle">Overview of your AI workforce and account</div>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon c">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <div className="stat-delta up">↑ 12%</div>
            </div>
            <div className="stat-value">2.4M</div>
            <div className="stat-label">Tokens used this month</div>
            <div className="sparkline" />
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon p">
                <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div className="stat-delta up">+1</div>
            </div>
            <div className="stat-value">3</div>
            <div className="stat-label">Active projects</div>
            <div className="sparkline" />
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon g">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
              </div>
              <div className="stat-delta up">↑ 24%</div>
            </div>
            <div className="stat-value">47</div>
            <div className="stat-label">Tasks completed</div>
            <div className="sparkline" />
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon o">
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
              </div>
              <div className="stat-delta" style={{ color: 'var(--ds-accent)' }}>5 new</div>
            </div>
            <div className="stat-value">12</div>
            <div className="stat-label">Deliverables ready</div>
            <div className="sparkline" />
          </div>
        </div>
        <div className="quota-strip">
          <div className="quota-info">
            <div className="quota-info-label">Token Usage</div>
            <div className="quota-info-value">2,412,000 <span>/ 10,000,000</span></div>
          </div>
          <div className="quota-bar-wrap">
            <div className="quota-bar"><div className="quota-fill ok" style={{ width: '24%' }} /></div>
            <div className="quota-meta"><span>24% used</span><span>Projected: ~$38.50 this month</span></div>
          </div>
          <div className="quota-right">
            <div className="quota-right-days">18</div>
            <div className="quota-right-label">days until reset</div>
          </div>
        </div>
        <div className="two-col">
          <div className="panel">
            <div className="panel-head">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Recent Activity
            </div>
            <div className="act-item"><div className="act-dot agent" /><div className="act-text"><strong>SiteBuilder</strong> deployed landing page to production</div><div className="act-time">12m</div></div>
            <div className="act-item"><div className="act-dot file" /><div className="act-text"><strong>Final_website_v3.zip</strong> ready for download</div><div className="act-time">28m</div></div>
            <div className="act-item"><div className="act-dot agent" /><div className="act-text"><strong>MarketingPro</strong> published weekly blog post</div><div className="act-time">1h</div></div>
            <div className="act-item"><div className="act-dot bill" /><div className="act-text">Monthly invoice <strong>#INV-0042</strong> generated — $49.00</div><div className="act-time">3h</div></div>
            <div className="act-item"><div className="act-dot agent" /><div className="act-text"><strong>FinBot</strong> completed Q1 expense report</div><div className="act-time">5h</div></div>
            <div className="act-item"><div className="act-dot file" /><div className="act-text"><strong>Brand_guidelines_v2.pdf</strong> ready for download</div><div className="act-time">1d</div></div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Active Projects
              <span className="badge-count">3</span>
            </div>
            <div className="proj-mini">
              <div className="proj-mini-icon" style={{ background: 'rgba(var(--ds-accent-rgb),0.1)', color: 'var(--ds-accent)' }}>🏗️</div>
              <div className="proj-mini-info">
                <div className="proj-mini-name">E-commerce Redesign</div>
                <div className="proj-mini-meta">SiteBuilder Agent · 7/10 tasks</div>
              </div>
              <span className="badge-sm badge-active">Active</span>
            </div>
            <div className="proj-mini">
              <div className="proj-mini-icon" style={{ background: 'rgba(var(--ds-purple-rgb),0.1)', color: 'var(--ds-purple)' }}>📣</div>
              <div className="proj-mini-info">
                <div className="proj-mini-name">Q1 Marketing Campaign</div>
                <div className="proj-mini-meta">MarketingPro Agent · 12/15 tasks</div>
              </div>
              <span className="badge-sm badge-active">Active</span>
            </div>
            <div className="proj-mini">
              <div className="proj-mini-icon" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--ds-green)' }}>📊</div>
              <div className="proj-mini-info">
                <div className="proj-mini-name">Financial Reports Q1</div>
                <div className="proj-mini-meta">FinBot Agent · 4/4 tasks</div>
              </div>
              <span className="badge-sm badge-done">Done</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (page === 'projects') {
    return (
      <>
        <div className="demo-banner"><strong>Demonstrative only.</strong> Static content from template.</div>
        <div className="page-header">
          <div>
            <div className="page-title">Projects</div>
            <div className="page-subtitle">All your AI agent projects and their status</div>
          </div>
          <button type="button" className="btn-p" style={{ marginLeft: 'auto' }}>+ New Project</button>
        </div>
        <div className="table-card">
          <div className="table-head">
            <div className="table-title">All Projects</div>
            <div className="table-count">5</div>
            <div className="filter-bar">
              <button type="button" className="filter-chip active">Active</button>
              <button type="button" className="filter-chip">Completed</button>
              <button type="button" className="filter-chip">All</button>
            </div>
          </div>
          <table>
            <thead><tr><th>Project</th><th>Agent</th><th>Progress</th><th>Tokens</th><th>Files</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              <tr><td className="td-name">E-commerce Redesign</td><td>SiteBuilder</td><td><ProgressBar width={70} color="--ds-accent" label="7/10" /></td><td className="td-mono">840K</td><td>5</td><td><span className="badge-sm badge-active">Active</span></td><td className="td-mono">12 min ago</td></tr>
              <tr><td className="td-name">Q1 Marketing Campaign</td><td>MarketingPro</td><td><ProgressBar width={80} color="--ds-purple" label="12/15" /></td><td className="td-mono">1.2M</td><td>8</td><td><span className="badge-sm badge-active">Active</span></td><td className="td-mono">1h ago</td></tr>
              <tr><td className="td-name">Financial Reports Q1</td><td>FinBot</td><td><ProgressBar width={100} color="--ds-green" label="4/4" /></td><td className="td-mono">320K</td><td>3</td><td><span className="badge-sm badge-done">Done</span></td><td className="td-mono">5h ago</td></tr>
              <tr><td className="td-name">iOS App Prototype</td><td>DevBuilder</td><td><ProgressBar width={30} color="--ds-accent" label="2/8" /></td><td className="td-mono">180K</td><td>1</td><td><span className="badge-sm badge-active">Active</span></td><td className="td-mono">2d ago</td></tr>
              <tr><td className="td-name">Brand Video Package</td><td>CreativeAgent</td><td><ProgressBar width={100} color="--ds-green" label="6/6" /></td><td className="td-mono">560K</td><td>4</td><td><span className="badge-sm badge-done">Done</span></td><td className="td-mono">1w ago</td></tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (page === 'deliverables') {
    return (
      <>
        <div className="demo-banner"><strong>Demonstrative only.</strong> Static content from template.</div>
        <div className="page-header">
          <div>
            <div className="page-title">Deliverables</div>
            <div className="page-subtitle">Files and outputs from your AI agents</div>
          </div>
          <div className="filter-bar" style={{ marginLeft: 'auto' }}>
            <button type="button" className="filter-chip active">All</button>
            <button type="button" className="filter-chip">New</button>
            <button type="button" className="filter-chip">Downloaded</button>
          </div>
        </div>
        <div className="quota-strip" style={{ marginBottom: 20 }}>
          <div className="quota-info">
            <div className="quota-info-label">Storage</div>
            <div className="quota-info-value">1.2 GB <span>/ 10 GB</span></div>
          </div>
          <div className="quota-bar-wrap">
            <div className="quota-bar"><div className="quota-fill ok" style={{ width: '12%' }} /></div>
            <div className="quota-meta"><span>12% used</span><span>21 files</span></div>
          </div>
        </div>
        <div className="deliv-grid">
          {[
            { type: 'zip', icon: '📦', name: 'Final_website_v3.zip', meta: '2.4 GB · 28 min ago', project: 'E-commerce Redesign', new: true },
            { type: 'pdf', icon: '📄', name: 'Brand_guidelines_v2.pdf', meta: '48 MB · 1 day ago', project: 'Q1 Marketing', new: true },
            { type: 'fig', icon: '🎨', name: 'App_screens_final.fig', meta: '220 MB · 2 days ago', project: 'iOS App Prototype', new: true },
            { type: 'mp4', icon: '🎬', name: 'Promo_video_60s.mp4', meta: '890 MB · 3 days ago', project: 'Brand Video Package', new: true },
            { type: 'code', icon: '📊', name: 'Q1_expense_report.xlsx', meta: '1.2 MB · 5 hours ago', project: 'Financial Reports Q1', new: true },
            { type: 'pdf', icon: '📄', name: 'SEO_audit_report.pdf', meta: '3.8 MB · 1 week ago', project: 'Q1 Marketing', new: false },
            { type: 'zip', icon: '📦', name: 'Homepage_rev2_assets.zip', meta: '340 MB · 1 week ago', project: 'E-commerce Redesign', new: false },
            { type: 'code', icon: '📊', name: 'Monthly_revenue_jan.xlsx', meta: '0.8 MB · 2 weeks ago', project: 'Financial Reports Q1', new: false },
            { type: 'fig', icon: '🎨', name: 'Wireframes_complete.fig', meta: '184 MB · 2 weeks ago', project: 'E-commerce Redesign', new: false },
          ].map((d) => (
            <div key={d.name} className="deliv-card">
              <div className={`deliv-type ${d.type}`}>{d.icon}</div>
              <div className="deliv-name">{d.name}</div>
              <div className="deliv-meta">{d.meta}</div>
              <div className="deliv-bottom">
                <div className="deliv-project">{d.project}</div>
                {d.new ? <span className="deliv-new">NEW</span> : <span style={{ fontSize: 10, color: 'var(--ds-text-dim)' }}>Downloaded</span>}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (page === 'usage') {
    return (
      <>
        <div className="demo-banner"><strong>Demonstrative only.</strong> Static content from template.</div>
        <div className="page-header">
          <div>
            <div className="page-title">Usage & Tokens</div>
            <div className="page-subtitle">Token consumption, costs, and quota tracking</div>
          </div>
          <button type="button" className="btn-g">Export CSV</button>
        </div>
        <div className="quota-strip">
          <div className="quota-info">
            <div className="quota-info-label">Monthly Quota</div>
            <div className="quota-info-value">2,412,000 <span>/ 10,000,000</span></div>
          </div>
          <div className="quota-bar-wrap">
            <div className="quota-bar"><div className="quota-fill ok" style={{ width: '24%' }} /></div>
            <div className="quota-meta"><span>24% used · $24.12 cost to date</span><span>Projected: ~$38.50</span></div>
          </div>
          <div className="quota-right">
            <div className="quota-right-days">18</div>
            <div className="quota-right-label">days left</div>
          </div>
        </div>
        <div className="chart-wrap">
          <div className="chart-head">
            <div className="chart-title">Daily Token Usage</div>
            <div className="chart-legend">
              <span><span className="chart-legend-dot" style={{ background: 'var(--ds-accent)' }} />Input</span>
              <span><span className="chart-legend-dot" style={{ background: 'var(--ds-purple)' }} />Output</span>
            </div>
            <div className="filter-bar">
              <button type="button" className="filter-chip active">This month</button>
              <button type="button" className="filter-chip">Last 7 days</button>
              <button type="button" className="filter-chip">Last 30 days</button>
            </div>
          </div>
          <div className="chart-area" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8 }} />
        </div>
        <div className="table-card">
          <div className="table-head">
            <div className="table-title">Usage Breakdown</div>
            <div className="filter-bar">
              <button type="button" className="filter-chip active">By Project</button>
              <button type="button" className="filter-chip">By Agent</button>
              <button type="button" className="filter-chip">By Day</button>
            </div>
          </div>
          <table>
            <thead><tr><th>Project</th><th>Agent</th><th>Input</th><th>Output</th><th>Total</th><th>Cost</th><th>%</th></tr></thead>
            <tbody>
              <tr><td className="td-name">Q1 Marketing Campaign</td><td>MarketingPro</td><td className="td-mono">780K</td><td className="td-mono">420K</td><td className="td-mono">1.2M</td><td className="td-mono">$12.00</td><td>50%</td></tr>
              <tr><td className="td-name">E-commerce Redesign</td><td>SiteBuilder</td><td className="td-mono">520K</td><td className="td-mono">320K</td><td className="td-mono">840K</td><td className="td-mono">$8.40</td><td>35%</td></tr>
              <tr><td className="td-name">Financial Reports Q1</td><td>FinBot</td><td className="td-mono">200K</td><td className="td-mono">120K</td><td className="td-mono">320K</td><td className="td-mono">$3.20</td><td>13%</td></tr>
              <tr><td className="td-name">iOS App Prototype</td><td>DevBuilder</td><td className="td-mono">32K</td><td className="td-mono">20K</td><td className="td-mono">52K</td><td className="td-mono">$0.52</td><td>2%</td></tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (page === 'billing') {
    return (
      <>
        <div className="demo-banner"><strong>Demonstrative only.</strong> Static content from template.</div>
        <div className="page-header">
          <div>
            <div className="page-title">Billing</div>
            <div className="page-subtitle">Plan, payments, invoices, and spending controls</div>
          </div>
        </div>
        <div className="billing-grid">
          <div className="plan-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="plan-pill">PRO</span>
              <span style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>Current Plan</span>
            </div>
            <div className="plan-card-name">Pro Plan</div>
            <div className="plan-card-price">$49 <span>/ month</span></div>
            <ul className="plan-card-features">
              <li>10,000,000 tokens / month</li>
              <li>5 concurrent agents</li>
              <li>10 GB deliverable storage</li>
              <li>Priority support (12h SLA)</li>
              <li>API access</li>
              <li>Team seats (up to 5)</li>
            </ul>
            <div className="plan-card-renew">Next renewal: <strong>March 1, 2026</strong> · $49.00</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="btn-p">Upgrade to Enterprise</button>
              <button type="button" className="btn-g">Change Plan</button>
            </div>
          </div>
          <div className="payment-card">
            <div className="payment-card-title">Payment Method</div>
            <div className="cc-display">
              <div className="cc-brand">VISA</div>
              <div className="cc-number">•••• •••• •••• 4242</div>
              <div className="cc-expiry">12/27</div>
            </div>
            <button type="button" className="btn-g" style={{ width: '100%', justifyContent: 'center' }}>Update Payment Method</button>
            <div className="spend-control">
              <div className="spend-label">Monthly Spend Cap</div>
              <div className="spend-row">
                <span style={{ fontSize: 14, color: 'var(--ds-text-muted)' }}>$</span>
                <input className="spend-input" type="number" defaultValue={100} readOnly />
                <button type="button" className="btn-g" style={{ padding: '7px 12px' }}>Save</button>
              </div>
            </div>
          </div>
        </div>
        <div className="table-card">
          <div className="table-head">
            <div className="table-title">Invoice History</div>
            <button type="button" className="btn-g">Export All</button>
          </div>
          <table>
            <thead><tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td className="td-name">INV-0042</td><td>Feb 2026</td><td className="td-mono">$49.00</td><td><span className="badge-sm" style={{ background: 'rgba(234,179,8,0.12)', color: 'var(--ds-yellow)' }}>Open</span></td><td className="td-mono">Feb 1, 2026</td><td><button type="button" className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }}>PDF</button></td></tr>
              <tr><td className="td-name">INV-0041</td><td>Jan 2026</td><td className="td-mono">$49.00</td><td><span className="badge-sm badge-done">Paid</span></td><td className="td-mono">Jan 1, 2026</td><td><button type="button" className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }}>PDF</button></td></tr>
              <tr><td className="td-name">INV-0040</td><td>Dec 2025</td><td className="td-mono">$49.00</td><td><span className="badge-sm badge-done">Paid</span></td><td className="td-mono">Dec 1, 2025</td><td><button type="button" className="btn-g" style={{ padding: '4px 10px', fontSize: 10 }}>PDF</button></td></tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (page === 'settings') {
    return (
      <>
        <div className="demo-banner"><strong>Demonstrative only.</strong> Static content from template.</div>
        <div className="page-header">
          <div>
            <div className="page-title">Settings</div>
            <div className="page-subtitle">Account, notifications, and API configuration</div>
          </div>
        </div>
        <div className="settings-tabs">
          <button type="button" className="s-tab active">Profile</button>
          <button type="button" className="s-tab">Notifications</button>
          <button type="button" className="s-tab">API Keys</button>
          <button type="button" className="s-tab">Security</button>
        </div>
        <div className="settings-panel active">
          <div className="panel" style={{ padding: 24 }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" defaultValue="Marko Kovač" readOnly /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue="marko@firma.com" readOnly /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Company</label><input className="form-input" defaultValue="Firma d.o.o." readOnly /></div>
              <div className="form-group"><label className="form-label">Timezone</label><input className="form-input" defaultValue="Europe/Sarajevo (UTC+1)" readOnly /></div>
            </div>
            <button type="button" className="btn-p" style={{ marginTop: 16 }}>Save Changes</button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
