import { useReveal } from '../hooks/useReveal';

export function FontShowcase(): JSX.Element {
  const sectionRef = useReveal();

  return (
    <section className="font-showcase rv" id="fonts" ref={sectionRef}>
      <div className="wrap">
        <div className="section-label">Typography System</div>
        <div className="section-title">
          The Buildor <span className="cyan-accent">4‑font</span> system.
        </div>
        <p className="section-desc" style={{ marginBottom: '48px' }}>
          Every element uses the right typeface for its role — headings command attention, body text flows naturally, UI stays crisp, and code is always readable.
        </p>

        <div className="font-grid">
          <div className="font-card rv rv-d1">
            <div className="font-card-header">
              <div className="font-card-role">Headings</div>
              <div className="font-card-meta">IBM Plex Sans · 600–700</div>
            </div>
            <div
              className="font-card-preview"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '36px',
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              One app.
              <br />
              Infinite agents.
            </div>
            <div className="font-card-tokens">
              <span className="font-token">H1 48/56 700</span>
              <span className="font-token">H2 36/44 600</span>
              <span className="font-token">H3 28/36 600</span>
            </div>
          </div>

          <div className="font-card rv rv-d2">
            <div className="font-card-header">
              <div className="font-card-role">Body</div>
              <div className="font-card-meta">IBM Plex Serif · 400–500</div>
            </div>
            <div
              className="font-card-preview"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '17px',
                fontWeight: 400,
                lineHeight: 1.65,
              }}
            >
              Buildor is a desktop & mobile app that gives you an AI workforce. Create agents that build, manage, and protect — anything you need.
            </div>
            <div className="font-card-tokens">
              <span className="font-token">Body 1: 17/28</span>
              <span className="font-token">Body 2: 15/24</span>
            </div>
          </div>

          <div className="font-card rv rv-d3">
            <div className="font-card-header">
              <div className="font-card-role">UI</div>
              <div className="font-card-meta">Inter · 400–600</div>
            </div>
            <div
              className="font-card-preview"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              <span style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '8px 18px',
                    border: '1px solid var(--border-3)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                  }}
                >
                  Download Free
                </span>
                <span style={{ color: 'var(--text-3)' }}>Platform</span>
                <span style={{ color: 'var(--text-3)' }}>Agents</span>
                <span style={{ color: 'var(--text-3)' }}>How It Works</span>
                <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>UPPERCASE LABEL</span>
              </span>
            </div>
            <div className="font-card-tokens">
              <span className="font-token">Caption 12/16</span>
              <span className="font-token">Label 500</span>
              <span className="font-token">Button 600</span>
            </div>
          </div>

          <div className="font-card rv rv-d4">
            <div className="font-card-header">
              <div className="font-card-role">Code</div>
              <div className="font-card-meta">JetBrains Mono · 400–500</div>
            </div>
            <div
              className="font-card-preview"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: 1.5,
                color: 'var(--text-3)',
              }}
            >
              <span style={{ color: 'var(--purple)' }}>export default</span>{' '}
              <span style={{ color: 'var(--cyan)' }}>function</span>{' '}
              <span style={{ color: 'var(--green)' }}>Agent</span>
              () {'{'}
              <br />
              &nbsp;&nbsp;<span style={{ color: 'var(--purple)' }}>return</span> &lt;
              <span style={{ color: 'var(--cyan)' }}>Workspace</span> /&gt;
              <br />
              {'}'}
            </div>
            <div className="font-card-tokens">
              <span className="font-token">14/20 400</span>
              <span className="font-token">Inline code</span>
              <span className="font-token">Token values</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FontShowcase;
