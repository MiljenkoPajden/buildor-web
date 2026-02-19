import { useEffect, useRef } from 'react';
import { useReveal } from '../hooks/useReveal';

const FEATURES = [
  { icon: 'code', text: 'Open agent framework to build and test any role' },
  { icon: 'cloud', text: 'Cloud platform for deploying and scaling agents' },
  { icon: 'grid', text: 'Full-stack observability for every agent session' },
  { icon: 'user', text: 'Inbox, calendar, browser, and planner tools built-in' },
  { icon: 'shield', text: 'AI Security Agent for 24/7 system protection' },
];

const SVG_ICONS: Record<string, JSX.Element> = {
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square">
      <path d="M9.75 20.25L14.25 3.75M18.25 7.75L22.25 12L18.25 16.25M5.75 16.25L1.75 12L5.75 7.75" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M17.125 19.25H8.925C4.96 19.25 1.75 16 1.75 12S4.96 4.75 8.925 4.75c2.96 0 5.5 1.81 6.6 4.4.5-.17 1.04-.26 1.6-.26 2.83 0 5.125 2.32 5.125 5.18s-2.295 5.18-5.125 5.18z" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square">
      <path d="M3.75 9.25H9.25V3.75H3.75V9.25zM3.75 9.25V14.75M3.75 9.25H14.75V14.75H3.75M3.75 14.75V20.25H20.25V14.75H3.75M3.75 1.75V22.25" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5S9.5 11 12 11s4.5-2 4.5-4.5S14.5 2 12 2zM12 12c-4.8 0-8.1 3.8-8.5 8.5L3.45 21h17.1l-.05-.5C20.1 15.8 16.8 12 12 12z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

const ARCH_CARDS = [
  { label: 'Agent Builder', icon: '🏗️', dx: 0, dy: 0, z: 1000 },
  { label: 'Chat Engine', icon: '💬', dx: 90, dy: -54, z: 999 },
  { label: 'Task Runner', icon: '⚡', dx: 120, dy: -72, z: 998 },
  { label: 'AI Models', icon: '🧠', dx: 150, dy: -90, z: 997 },
  { label: 'Security', icon: '🛡️', dx: 180, dy: -108, z: 996 },
  { label: 'Deploy', icon: '🚀', dx: 210, dy: -126, z: 995 },
];

export function ArchSection(): JSX.Element {
  const wrapRef = useReveal<HTMLDivElement>();
  const layoutRef = useReveal<HTMLDivElement>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const linesEl = linesRef.current;
    if (!canvas || !linesEl) return;

    ARCH_CARDS.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'how-iso-card';
      el.style.cssText = `
        transform: translate(calc(-50% + ${card.dx}px), calc(-59% + ${card.dy}px)) skewX(0deg) skewY(30deg);
        z-index: ${card.z};
        transition-delay: ${i * 0.05}s;
      `;
      el.innerHTML = `<div class="card-icon">${card.icon}</div>`;
      const labelEl = document.createElement('div');
      labelEl.className = 'iso-label';
      labelEl.textContent = card.label;
      labelEl.style.cssText = 'top: -12px; right: -16px; transform: translateX(100%);';
      el.appendChild(labelEl);
      canvas.appendChild(el);
    });

    const labels = [
      { text: 'WebRTC', x: '55%', y: '38%' },
      { text: 'Agent API', x: '35%', y: '65%' },
      { text: 'HTTP/WS', x: '70%', y: '85%' },
    ];
    labels.forEach((l) => {
      const pill = document.createElement('div');
      pill.className = 'iso-label';
      pill.textContent = l.text;
      pill.style.cssText = `left:${l.x}; top:${l.y}; z-index:50;`;
      canvas.appendChild(pill);
    });
  }, []);

  return (
    <section className="arch-section" id="architecture">
      <div className="wrap rv" ref={wrapRef}>
        <div className="section-label">Architecture</div>
        <div className="section-title">
          The <span className="cyan-accent">complete</span> stack for AI agents.
        </div>
      </div>
      <div className="wrap">
        <div className="arch-layout rv rv-d1" ref={layoutRef}>
          <div>
            <p className="section-desc" style={{ marginBottom: '32px' }}>
              Everything your AI workforce needs in one integrated platform — from agent creation to deployment, monitoring, and scaling.
            </p>
            <div className="arch-features">
              {FEATURES.map((f) => (
                <div key={f.text} className="arch-feat">
                  {SVG_ICONS[f.icon]}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="arch-visual" id="archDiagram">
            <svg ref={linesRef} className="arch-lines" id="archLines" viewBox="0 0 600 580" />
            <div ref={canvasRef} className="arch-canvas" id="archCanvas" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ArchSection;
