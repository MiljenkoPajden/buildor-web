import { useReveal } from '../hooks/useReveal';

export function CTA(): JSX.Element {
  const ref = useReveal();

  return (
    <section className="cta rv" ref={ref}>
      <div className="wrap">
        <div className="section-label">Ready?</div>
        <div className="section-title">
          Start building with <span className="cyan-accent">AI agents</span> today.
        </div>
        <p className="section-desc">
          Download Buildor for free and create your first agent in under 60 seconds. No credit card required.
        </p>
        <div className="cta-actions">
          <a href="#" className="btn btn-cyan btn-lg">
            Download Free
          </a>
          <a href="#platform" className="btn btn-ghost btn-lg">
            See All Features →
          </a>
        </div>
      </div>
    </section>
  );
}

export default CTA;
