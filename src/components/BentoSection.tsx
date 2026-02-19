import { useReveal } from '../hooks/useReveal';

const ROLES = [
  'Web Developer',
  'Accountant',
  'UI Designer',
  'Therapist',
  'Marketing',
  'Lawyer',
  'Support',
  'Data Analyst',
  'App Builder',
  '+ Anything',
];

export function BentoSection(): JSX.Element {
  const headerRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();

  return (
    <section className="bento-section" id="platform">
      <div className="wrap">
        <div className="bento-header rv" ref={headerRef}>
          <div className="section-label">Platform</div>
          <div className="section-title">
            Your entire workflow. <span className="cyan-accent">One</span> application.
          </div>
          <p className="section-desc">
            Buildor isn&apos;t just an agent builder — it&apos;s a complete operating environment with inbox, calendar, browser, planner, and AI security built in.
          </p>
        </div>

        <div className="bento-grid rv rv-d1" ref={gridRef}>
          <div className="bento-cell hero-cell">
            <div className="bento-eyebrow cyan">Core Engine</div>
            <h3>
              Create agents for any role <span className="cyan-accent">imaginable</span>
            </h3>
            <p>
              Accountants, developers, designers, marketers, lawyers, therapists, support agents — describe the role, Buildor builds the agent.
            </p>
            <div className="role-chips">
              {ROLES.map((role, i) => (
                <span
                  key={role}
                  className={`role-chip ${i === 0 || i === ROLES.length - 1 ? 'glow' : ''}`}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="bento-cell">
            <div className="bento-eyebrow purple">Build</div>
            <h3>Apps, sites & software</h3>
            <p>Agents create full websites, mobile apps, marketing tools, and design assets from your description.</p>
          </div>

          <div className="bento-cell">
            <div className="bento-eyebrow green">Communicate</div>
            <h3>Unified inbox</h3>
            <p>All messages in one place. Your agents can triage, draft, and respond automatically.</p>
            <div className="mini-ui">
              <div className="mini-row">
                <span>📧 Client inquiry — Re: Project proposal</span>
                <span style={{ color: 'var(--text-5)' }}>2m</span>
              </div>
              <div className="mini-row">
                <span>📑 Invoice paid — Stripe notification</span>
                <span style={{ color: 'var(--text-5)' }}>14m</span>
              </div>
            </div>
          </div>

          <div className="bento-cell">
            <div className="bento-eyebrow orange">Browse</div>
            <h3>Built-in browser</h3>
            <p>Agents research, scrape, and interact with any website autonomously.</p>
            <div className="mini-ui">
              <div className="mini-bar">
                <span style={{ opacity: 0.5 }}>🔒</span>
                <span className="url">buildor.app/research</span>
              </div>
              <div className="mini-row" style={{ padding: '16px 14px', color: 'var(--text-5)', fontSize: '11px' }}>
                Loading search results...
              </div>
            </div>
          </div>

          <div className="bento-cell">
            <div className="bento-eyebrow green">Protect</div>
            <h3>AI Security Agent</h3>
            <p>An AI technician that monitors, maintains, and protects your entire system 24/7.</p>
            <div className="shield-viz">
              <div className="shield-stat">
                <span>Threat scan</span>
                <div className="shield-fill">
                  <div className="shield-fill-inner" style={{ width: '100%' }} />
                </div>
                <span style={{ color: 'var(--green)' }}>100%</span>
              </div>
              <div className="shield-stat">
                <span>System health</span>
                <div className="shield-fill">
                  <div className="shield-fill-inner" style={{ width: '95%' }} />
                </div>
                <span style={{ color: 'var(--green)' }}>95%</span>
              </div>
              <div className="shield-stat">
                <span>Auto-repair</span>
                <div className="shield-fill">
                  <div className="shield-fill-inner" style={{ width: '88%' }} />
                </div>
                <span style={{ color: 'var(--amber)' }}>88%</span>
              </div>
            </div>
          </div>

          <div className="bento-cell">
            <div className="bento-eyebrow pink">Organize</div>
            <h3>Planner & Calendar</h3>
            <p>Schedule tasks, deadlines, and let agents auto-manage your workflow.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BentoSection;
