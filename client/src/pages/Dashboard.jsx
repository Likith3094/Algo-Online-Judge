import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listContests } from '../api/auth';

function Dashboard() {
  const [contests, setContests] = useState([]);
  const [filteredContests, setFilteredContests] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, ongoing, upcoming, completed
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadContests = async () => {
    try {
      const response = await listContests();
      if (response.data && Array.isArray(response.data.contests)) {
        setContests(response.data.contests);
        setFilteredContests(response.data.contests);
      } else if (Array.isArray(response.data)) {
        // Fallback for different API response format
        setContests(response.data);
        setFilteredContests(response.data);
      }
    } catch (err) {
      setError('Unable to load contests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests();
  }, []);

  // Filter contests when search query or tab change
  useEffect(() => {
    const now = new Date();
    let result = contests;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          (c.creatorId?.username && c.creatorId.username.toLowerCase().includes(query))
      );
    }

    // Filter by tab
    if (activeTab === 'ongoing') {
      result = result.filter((c) => new Date(c.startTime) <= now && new Date(c.endTime) >= now);
    } else if (activeTab === 'upcoming') {
      result = result.filter((c) => new Date(c.startTime) > now);
    } else if (activeTab === 'completed') {
      result = result.filter((c) => new Date(c.endTime) < now);
    }

    setFilteredContests(result);
  }, [searchQuery, activeTab, contests]);

  const getContestStatus = (start, end) => {
    const now = new Date();
    const startTime = new Date(start);
    const endTime = new Date(end);

    if (now < startTime) {
      return { label: 'Upcoming', className: 'status-upcoming' };
    } else if (now >= startTime && now <= endTime) {
      return { label: 'Ongoing', className: 'status-ongoing' };
    } else {
      return { label: 'Completed', className: 'status-completed' };
    }
  };

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <h1>Contest Marketplace</h1>
        <p>Explore coding rounds, test your algorithm speed, and view global leaderboards.</p>
      </header>

      {error && (
        <div className="message-banner error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Control Bar: Search and Tabs */}
      <div className="dashboard-controls">
        <div className="tabs-container">
          {['all', 'ongoing', 'upcoming', 'completed'].map((tab) => (
            <button
              key={tab}
              className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search contests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrapper" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p className="loading-text">Loading contests marketplace...</p>
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>No Contests Found</p>
          <p style={{ fontSize: '14px' }}>Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="contest-grid">
          {filteredContests.map((contest) => {
            const status = getContestStatus(contest.startTime, contest.endTime);
            const durationHrs = Math.round((new Date(contest.endTime) - new Date(contest.startTime)) / 3600000);

            return (
              <Link to={`/contests/${contest._id}`} className="contest-card" key={contest._id}>
                <div className="card-top">
                  <span className={`contest-status-badge ${status.className}`}>{status.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {durationHrs} hrs
                  </span>
                </div>

                <h3>{contest.title}</h3>

                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineBreak: 'anywhere' }}>
                  {contest.description || 'No description provided for this contest.'}
                </p>

                <div className="contest-meta-list">
                  <div className="contest-meta-item">
                    <span>📅</span> Start: <strong>{new Date(contest.startTime).toLocaleString()}</strong>
                  </div>
                  <div className="contest-meta-item">
                    <span>👤</span> Organizer: <strong>{contest.creatorId?.username || 'System'}</strong>
                  </div>
                  <div className="contest-meta-item">
                    <span>🧩</span> Problems: <strong>{contest.problems?.length || 0} tasks</strong>
                  </div>
                  <div className="contest-meta-item">
                    <span>👥</span> Registered: <strong>{contest.registeredUsers?.length || 0} coders</strong>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
