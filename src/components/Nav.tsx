import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrowserProfile } from '../context/BrowserProfileContext';

export interface NavProps {
  onOpenModal: () => void;
  onOpenSignUp: () => void;
}

function ProfileSwitcher(): JSX.Element | null {
  const { profiles, activeProfile, switchProfile } = useBrowserProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (profiles.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={`Profile: ${activeProfile?.name ?? 'None'} (Ctrl+Shift+P to cycle)`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: 'var(--text-secondary, #94a3b8)', transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: activeProfile?.icon_color ?? '#57c3ff',
        }} />
        {activeProfile?.name ?? 'Profile'}
        {profiles.length > 1 && (
          <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 2 }}>
            {open ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </button>

      {open && profiles.length > 1 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          minWidth: 180, padding: 4,
          background: 'var(--bg-card, #0d1117)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 999,
        }}>
          {profiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { switchProfile(p.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 10px', border: 'none', borderRadius: 6,
                background: p.id === activeProfile?.id ? 'rgba(87,195,255,0.08)' : 'transparent',
                cursor: 'pointer', fontSize: 11, textAlign: 'left',
                color: p.id === activeProfile?.id ? 'var(--accent, #57c3ff)' : 'var(--text-secondary, #94a3b8)',
                fontWeight: p.id === activeProfile?.id ? 700 : 500,
                transition: 'background 0.1s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: p.icon_color ?? '#57c3ff',
              }} />
              <span style={{ flex: 1 }}>{p.name}</span>
              {p.client_name && (
                <span style={{ fontSize: 9, opacity: 0.4 }}>{p.client_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav({ onOpenModal, onOpenSignUp }: NavProps): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (): void => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = (): void => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} id="nav">
      <div className="nav-left">
        <Link to="/" className="nav-logo-icon" aria-label="Buildor home">
          <img src="/buildor-logo.svg" alt="Buildor" />
        </Link>
        <span className="nav-logo">Buildor</span>
      </div>
      <div className="nav-mid">
        <a href="#platform">Platform</a>
        <a href="#agents">Agents</a>
        <a href="#how">How It Works</a>
        <a href="#">Docs</a>
      </div>
      <div className="nav-right">
        {isLoggedIn ? (
          <>
            <ProfileSwitcher />
            <Link to="/admin" className="btn btn-ghost">
              Admin
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/admin" className="btn btn-ghost">
              Admin
            </Link>
            <button type="button" className="btn btn-ghost" onClick={onOpenModal}>
              Log In
            </button>
            <button type="button" className="btn btn-primary" onClick={onOpenSignUp}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Nav;
