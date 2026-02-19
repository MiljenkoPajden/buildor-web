import { Link, useLocation } from 'react-router-dom';

export function Footer(): JSX.Element {
  const location = useLocation();
  const isClassicHome = location.pathname === '/home-classic';

  return (
    <footer className="footer">
      <div>
        <span className="footer-brand">
          <img src="/buildor-logo.svg" alt="" width={20} height={20} className="footer-logo-img" />
          © 2025 Buildor
        </span>
      </div>
      <div className="footer-links">
        {isClassicHome ? (
          <Link to="/">Home</Link>
        ) : (
          <Link to="/home-classic">Classic home</Link>
        )}
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Docs</a>
        <a href="#">GitHub</a>
        <a href="#">Twitter</a>
      </div>
    </footer>
  );
}

export default Footer;
