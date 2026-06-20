import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
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
        {user ? (
          <>
            <div className={`user-badge role-${user.role}`}>
              <span>●</span>
              {user.username} ({user.role === 'creator' ? 'Creator' : 'User'})
            </div>
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
