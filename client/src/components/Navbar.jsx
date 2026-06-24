import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        ALGO<span>JUDGE</span>
      </Link>

      <ul className="nav-links">
        <li>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Home
          </Link>
        </li>
        <li>
          <Link to="/problems" className={`nav-link ${isActive('/problems') ? 'active' : ''}`}>
            Practice Arena
          </Link>
        </li>
        <li>
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
            Contest Marketplace
          </Link>
        </li>
        {user && user.role === 'creator' && (
          <li>
            <Link to="/creator" className={`nav-link ${isActive('/creator') ? 'active' : ''}`}>
              Creator Workspace
            </Link>
          </li>
        )}
      </ul>

      <div className="nav-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {user ? (
          <>
            <Link to="/profile" className={`user-badge role-${user.role}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <span>●</span>
              {user.username} ({user.role === 'creator' ? 'Creator' : 'User'})
            </Link>
            <button className="btn-signout" onClick={logout}>
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn-login-nav">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
