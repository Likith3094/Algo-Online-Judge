import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getContest, registerContest } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function ContestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('problems'); // problems, leaderboard
  const [timeLeft, setTimeLeft] = useState('');
  const timerRef = useRef(null);

  const loadContestDetails = async () => {
    try {
      const response = await getContest(id);
      if (response.data?.success) {
        setContest(response.data.contest);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not retrieve contest details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContestDetails();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Update countdown timer every second
  useEffect(() => {
    if (!contest) return;

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      if (now < start) {
        const diff = start - now;
        setTimeLeft(`Starts in: ${formatTime(diff)}`);
      } else if (now >= start && now <= end) {
        const diff = end - now;
        setTimeLeft(`Active! Ends in: ${formatTime(diff)}`);
      } else {
        setTimeLeft('Contest ended');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [contest]);

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    let str = '';
    if (days > 0) str += `${days}d `;
    if (hours > 0 || days > 0) str += `${hours}h `;
    str += `${mins}m ${secs}s`;
    return str;
  };

  const handleRegister = async () => {
    setError('');
    setMessage('');
    try {
      const response = await registerContest(id);
      if (response.data?.success) {
        setMessage('Registration successful! You can now participate in this contest.');
        loadContestDetails();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p className="loading-text">Loading contest specifications...</p>
      </div>
    );
  }

  if (error && !contest) {
    return (
      <div className="panel-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="message-banner error">⚠️ {error}</div>
        <Link to="/dashboard" className="btn-secondary" style={{ marginTop: '20px' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isCreator = user?.role === 'creator';
  const isRegistered = contest.registeredUsers?.some((u) => {
    if (!u) return false;
    return typeof u === 'string' ? u === user?.id : u._id === user?.id;
  });

  const now = new Date();
  const contestStarted = now >= new Date(contest.startTime);
  const contestEnded = now > new Date(contest.endTime);

  // Users must register to see problems and the contest must have started,
  // unless they are the creator or the contest has ended
  const canAccessContent = isCreator || contestEnded || (isRegistered && contestStarted);

  return (
    <div className="contest-details-container">
      {/* Upper Header Banner */}
      <div className="contest-header-banner">
        <div className="contest-header-info">
          <div className="hero-badge" style={{ marginBottom: '12px' }}>
            📅 {new Date(contest.startTime).toLocaleDateString()}
          </div>
          <h2>{contest.title}</h2>
          <p style={{ maxWidth: '700px', lineBreak: 'anywhere' }}>
            {contest.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="message-banner error" style={{ marginBottom: '20px' }}>
          <span>⚠️</span> {error}
        </div>
      )}
      {message && (
        <div className="message-banner success" style={{ marginBottom: '20px' }}>
          <span>✓</span> {message}
        </div>
      )}

      {/* Split Details Section */}
      <div className="detail-layout">
        {/* Main Content Pane */}
        <div className="detail-main">
          {!canAccessContent ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <h3 style={{ fontSize: '22px', marginBottom: '16px' }}>Registration Required</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 30px' }}>
                You must register to participate in this contest, view the problems, and submit solutions.
              </p>
              {contestEnded ? (
                <p className="muted">This contest has ended. Registration is closed.</p>
              ) : (
                <button className="btn-primary" onClick={handleRegister} style={{ padding: '14px 40px' }}>
                  Register for Contest
                </button>
              )}
            </div>
          ) : (
            <div className="panel-card">
              {/* Tab Selector */}
              <div className="creator-tabs" style={{ marginBottom: '24px' }}>
                <button
                  className={`creator-tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
                  onClick={() => setActiveTab('problems')}
                >
                  Problems ({contest.problems?.length || 0})
                </button>
                <button
                  className={`creator-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('leaderboard')}
                >
                  Leaderboard
                </button>
              </div>

              {activeTab === 'problems' ? (
                contest.problems?.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px' }}>
                    No problems are currently assigned to this contest.
                  </p>
                ) : (
                  <table className="problems-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Problem Title</th>
                        <th>Difficulty</th>
                        <th>Max Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contest.problems.map((problem, idx) => (
                        <tr key={problem._id}>
                          <td style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
                            {String.fromCharCode(65 + idx)}
                          </td>
                          <td style={{ fontWeight: '600' }}>{problem.title}</td>
                          <td>
                            <span className={`difficulty-badge difficulty-${problem.difficulty}`}>
                              {problem.difficulty}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{problem.points || 100} pts</td>
                          <td>
                            <Link to={`/problems/${problem._id}?contest=${contest._id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', boxShadow: 'none' }}>
                              Solve Task
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                /* Leaderboard panel */
                <div className="leaderboard-panel">
                  {contest.leaderboard?.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px' }}>
                      No submissions recorded yet. Be the first to solve!
                    </p>
                  ) : (
                    <div className="leaderboard-list">
                      <div className="leaderboard-row" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, paddingBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Rank & User</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Score (Time)</span>
                      </div>
                      {contest.leaderboard
                        .sort((a, b) => b.score - a.score || a.totalTime - b.totalTime)
                        .map((entry, index) => (
                          <div className="leaderboard-row" key={entry._id || index}>
                            <div className="leaderboard-user">
                              <span className={`leaderboard-rank rank-${index + 1}`}>{index + 1}</span>
                              <strong style={{ fontSize: '15px' }}>
                                {entry.userId?.username || 'Contestant'}
                              </strong>
                            </div>
                            <span className="leaderboard-score">
                              {entry.score} pts <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'normal' }}>({entry.totalTime}m)</span>
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="detail-sidebar">
          {/* Live Countdown Panel */}
          <div className="countdown-container" style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contest Clock
            </span>
            <div className="countdown-timer">{timeLeft}</div>
          </div>

          {/* Metadata Cards */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Contest Details</h3>
            <div className="contest-meta-list" style={{ border: 'none', paddingTop: 0 }}>
              <div className="contest-meta-item">
                <span>👤</span> Organizer: <strong>{contest.creatorId?.username || 'Admin'}</strong>
              </div>
              <div className="contest-meta-item">
                <span>📅</span> Opens: <strong>{new Date(contest.startTime).toLocaleTimeString()}</strong>
              </div>
              <div className="contest-meta-item">
                <span>🏁</span> Closes: <strong>{new Date(contest.endTime).toLocaleTimeString()}</strong>
              </div>
              <div className="contest-meta-item">
                <span>👥</span> Participants: <strong>{contest.registeredUsers?.length || 0} registered</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContestDetails;
