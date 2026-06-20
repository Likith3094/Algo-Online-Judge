import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProblems } from '../api/auth';

function ProblemsList() {
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, Easy, Medium, Hard
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProblems = async () => {
    try {
      const response = await listProblems();
      if (response.data && Array.isArray(response.data.problems)) {
        setProblems(response.data.problems);
        setFilteredProblems(response.data.problems);
      } else if (Array.isArray(response.data)) {
        setProblems(response.data);
        setFilteredProblems(response.data);
      }
    } catch (err) {
      setError('Unable to load problems database. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, []);

  // Filter problems when search query or tab change
  useEffect(() => {
    let result = problems;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(query)))
      );
    }

    // Filter by difficulty tab
    if (activeTab !== 'all') {
      result = result.filter((p) => p.difficulty === activeTab);
    }

    setFilteredProblems(result);
  }, [searchQuery, activeTab, problems]);

  return (
    <div className="problems-list-container">
      <header className="page-header">
        <h1>Practice Arena</h1>
        <p>Master your coding skills. Solve public problems, earn points, and build algorithms intuition.</p>
      </header>

      {error && (
        <div className="message-banner error" style={{ marginBottom: '20px' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Controls: Difficulty tabs and search input */}
      <div className="dashboard-controls">
        <div className="tabs-container">
          {['all', 'Easy', 'Medium', 'Hard'].map((tab) => (
            <button
              key={tab}
              className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'All Tasks' : tab}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search problems or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrapper" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
          <p className="loading-text">Loading problem library...</p>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>No Problems Found</p>
          <p style={{ fontSize: '14px' }}>Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="panel-card" style={{ padding: '20px' }}>
          <table className="problems-table">
            <thead>
              <tr>
                <th>Problem Title</th>
                <th>Difficulty</th>
                <th>Points Value</th>
                <th>Tags</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((problem) => (
                <tr key={problem._id}>
                  <td style={{ fontWeight: '600' }}>{problem.title}</td>
                  <td>
                    <span className={`difficulty-badge difficulty-${problem.difficulty}`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{problem.points || 100} pts</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {problem.tags && problem.tags.length > 0 ? (
                        problem.tags.map((t) => (
                          <span key={t} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', color: 'var(--text-secondary)' }}>
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link to={`/problems/${problem._id}`} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', boxShadow: 'none' }}>
                      Solve
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProblemsList;
