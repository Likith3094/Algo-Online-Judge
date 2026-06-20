import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = location.pathname === '/register' ? 'register' : 'login';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(searchParams.get('role') === 'creator' ? 'creator' : 'user');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  
  const { login, register, user } = useAuth();

  useEffect(() => {
    setError('');
  }, [location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'creator' ? '/creator' : '/dashboard');
    }
  }, [user, navigate]);

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return '';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score < 2) return 'weak';
    if (score < 4) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(calculatePasswordStrength(val));
  };

  const validate = () => {
    if (!email.trim() || !password) {
      return 'All fields are required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (mode === 'register') {
      if (!username.trim()) return 'Username is required.';
      if (username.trim().length < 3) return 'Username must be at least 3 characters.';
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password !== confirmPassword) return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationMsg = validate();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setIsSubmitting(true);

    if (mode === 'login') {
      const result = await login({ email: email.trim(), password });
      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
      }
    } else {
      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
      });
      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="panel-card auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              navigate('/login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              navigate('/register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        <h2 className="form-title">{mode === 'login' ? 'Welcome Back' : 'Get Started'}</h2>
        <p className="form-subtitle">
          {mode === 'login'
            ? 'Sign in to access contests, submit solutions and review scores.'
            : 'Join the community and start building algorithm skills.'}
        </p>

        {error && (
          <div className="message-banner error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter password'}
                value={password}
                onChange={handlePasswordChange}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {mode === 'register' && password && (
              <div>
                <div className="strength-bar-container">
                  <div className={`strength-bar ${passwordStrength}`} />
                  <div className={`strength-bar ${passwordStrength === 'medium' || passwordStrength === 'strong' ? passwordStrength : ''}`} />
                  <div className={`strength-bar ${passwordStrength === 'strong' ? passwordStrength : ''}`} />
                </div>
                <div className="strength-label">
                  <span>Strength: {passwordStrength}</span>
                  {passwordStrength === 'weak' && <span>Add numbers/symbols</span>}
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Register as</label>
                <select
                  id="role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="user">Participant (Solve problems)</option>
                  <option value="creator">Contest Creator (Manage problems/contests)</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="footer-text" style={{ marginTop: '20px' }}>
          {mode === 'login' ? (
            <>Don&apos;t have an account? <Link to="/register">Create one now</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Sign in here</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

export default Auth;
