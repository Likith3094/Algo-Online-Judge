import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <div className="home-container">
      {/* Hero Banner Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Build Code. <span>Compete Live.</span> Conquer Challenges.
        </h1>
        <p className="hero-description">
          Algo Online Judge (AOJ) is a platform to solve algorithm challenges,
          compete in live coding contests, and build your engineering profile.
        </p>

        <div className="hero-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-primary">
                View Contests
              </Link>
              {user.role === 'creator' && (
                <Link to="/creator" className="btn-secondary">
                  Creator Workspace
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/register" className="btn-primary">
                Get Started (Free)
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      {/* <section className="features-container">
        <h2>Built for Modern Problem Solvers</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Sandboxed Execution</h3>
            <p>
              Your code runs securely in isolated Docker sandboxes with strict CPU, memory limits, and 
              instant verdict reviews.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Competitive Contests</h3>
            <p>
              Participate in scheduled rounds with real-time leaderboards, dynamic scores, and penalty-based calculations.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛠️</div>
            <h3>Creator Studio</h3>
            <p>
              Write problems, import customized datasets, set time constraints, and review participants' solutions.
            </p>
          </div>
        </div>
      </section> */}
    </div>
  );
}

export default Home;
