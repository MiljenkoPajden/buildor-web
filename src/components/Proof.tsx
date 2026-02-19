import { useReveal } from '../hooks/useReveal';

const LOGOS = ['NexusAI', 'CloudStack', 'VeroLabs', 'PulseHQ', 'ArcMedia', 'ScaleUp', 'QuantumDev'];

export function Proof(): JSX.Element {
  const ref = useReveal();

  return (
    <section className="proof rv" ref={ref}>
      <div className="wrap">
        <div className="proof-label">Trusted by early adopters</div>
        <div className="proof-logos">
          {LOGOS.map((name) => (
            <span key={name} className="proof-logo">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Proof;
