import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface NavProps {
  onOpenModal: () => void;
}

export function Nav({ onOpenModal }: NavProps): JSX.Element {
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
            <Link to="/admin" className="btn btn-ghost">
              Admin
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleLogout}>
              Odjava
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
            <button type="button" className="btn btn-primary" onClick={onOpenModal}>
              Get Started
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Nav;
