export function Hero(): JSX.Element {
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-logo">
          <img src="/buildor-logo.svg" alt="Buildor" />
        </div>
        <div className="hero-pill">
          <span className="badge">v2</span>
          Now available on all platforms
        </div>
        <h1>
          One app.
          <br />
          <span className="cyan-accent">Infinite</span> agents.
        </h1>
        <p className="hero-desc">
          Buildor is a desktop & mobile app that gives you an AI workforce. Create agents that build websites, manage finances, handle marketing, protect your systems — and anything else you need.
        </p>
        <div className="hero-actions">
          <a href="#" className="btn btn-primary btn-lg">
            Download Free
          </a>
          <a href="#platform" className="btn btn-ghost btn-lg">
            Explore Platform →
          </a>
        </div>
        <div className="hero-platforms">
          <svg viewBox="0 0 24 24">
            <path d="M3 12.5l8-.001V21L3 19.5zm0-9L11 2v8.5H3zm9-2L21 0v11.5H12zM12 12.5h9V24l-9-1.5z" />
          </svg>
          <svg viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <svg viewBox="0 0 24 24">
            <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zM11.5 22c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-4h-8V4h8v14z" />
          </svg>
          <svg viewBox="0 0 24 24">
            <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V7H6v11zM3.5 7C2.67 7 2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-7C5 7.67 4.33 7 3.5 7zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
          </svg>
        </div>
      </div>
      <div className="app-preview">
        <div className="app-preview-frame">
          <img src="/app-screenshot.png" alt="Buildor App — AI Agent Workspace" />
        </div>
      </div>
    </section>
  );
}

export default Hero;
