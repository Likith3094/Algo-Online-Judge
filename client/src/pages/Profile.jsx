import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../api/auth';
import { Link } from 'react-router-dom';

function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProfileTab, setActiveProfileTab] = useState('participant');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetchProfile();
        if (response.data?.success) {
          setProfileData(response.data.profile);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch profile data.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p className="loading-text">Loading profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="panel-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="message-banner error">⚠️ {error || 'Profile not found.'}</div>
        <Link to="/dashboard" className="btn-secondary" style={{ marginTop: '20px' }}>
          Back to Contest Marketplace
        </Link>
      </div>
    );
  }

  const { username, email, role, createdAt, stats } = profileData;

  return (
    <div className="profile-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 0' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1>User Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal details and developer activities</p>
      </div>

      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Basic user info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '800',
            color: 'white',
            textTransform: 'uppercase'
          }}>
            {username.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', textTransform: 'capitalize', color: 'var(--text)' }}>{username}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '2px 0 6px 0' }}>{email}</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className={`user-badge role-${role}`} style={{ border: '1px solid var(--border)' }}>
                {role === 'creator' ? 'Creator Account' : 'Participant'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Joined: {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Section Selection Tabs for Creators */}
        {role === 'creator' && (
          <div className="tabs-container" style={{ alignSelf: 'flex-start', marginBottom: '10px' }}>
            <button
              className={`tab-pill ${activeProfileTab === 'participant' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('participant')}
            >
              Participant Profile
            </button>
            <button
              className={`tab-pill ${activeProfileTab === 'creator' ? 'active' : ''}`}
              onClick={() => setActiveProfileTab('creator')}
            >
              Creator Portfolio
            </button>
          </div>
        )}

        {/* SECTION 1: PARTICIPANT PROFILE */}
        {activeProfileTab === 'participant' && (
          <>
            {/* Aggregate Stats Section */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Stats Dashboard</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="stat-card" style={{ padding: '20px' }}>
                  <div className="stat-val">{stats.totalSolved}</div>
                  <div className="stat-label">Solved Problems</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                  <div className="stat-val">{stats.totalAttempted}</div>
                  <div className="stat-label">Attempted</div>
                </div>
                <div className="stat-card" style={{ padding: '20px' }}>
                  <div className="stat-val">{stats.totalSubmissions}</div>
                  <div className="stat-label">Total Submissions</div>
                </div>
              </div>
            </div>

            {/* Solved Problems Breakdown by Difficulty */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Solved Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{
                  background: 'var(--badge-easy-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'var(--badge-easy-text)', fontSize: '24px', fontWeight: '800' }}>
                    {stats.difficulty.Easy}
                  </div>
                  <div style={{ color: 'var(--badge-easy-text)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>
                    Easy Solved
                  </div>
                </div>

                <div style={{
                  background: 'var(--badge-medium-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'var(--badge-medium-text)', fontSize: '24px', fontWeight: '800' }}>
                    {stats.difficulty.Medium}
                  </div>
                  <div style={{ color: 'var(--badge-medium-text)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>
                    Medium Solved
                  </div>
                </div>

                <div style={{
                  background: 'var(--badge-hard-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'var(--badge-hard-text)', fontSize: '24px', fontWeight: '800' }}>
                    {stats.difficulty.Hard}
                  </div>
                  <div style={{ color: 'var(--badge-hard-text)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>
                    Hard Solved
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict Breakdowns */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Verdicts Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--success)' }}>{stats.verdicts.AC}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>AC</div>
                </div>
                <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--error)' }}>{stats.verdicts.WA}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>WA</div>
                </div>
                <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--warning)' }}>{stats.verdicts.TLE}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TLE</div>
                </div>
                <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontWeight: '700', color: '#f87171' }}>{stats.verdicts.RE}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RE</div>
                </div>
                <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-muted)' }}>{stats.verdicts.CE}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CE</div>
                </div>
              </div>
            </div>

            {/* Contest Participations — now inside Participant tab */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Contest Participations</h3>
              {!stats.contests || stats.contests.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You haven't registered for any contests yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="problems-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Contest Title</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Timeline</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.contests.map((c) => (
                        <tr key={c.id}>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)' }}>
                            <Link to={`/contests/${c.id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600' }}>
                              {c.title}
                            </Link>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {new Date(c.startTime).toLocaleString()} - {new Date(c.endTime).toLocaleString()}
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center' }}>
                            <span className={`contest-status-badge status-${c.status.toLowerCase()}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* SECTION 2: CREATOR PROFILE */}
        {activeProfileTab === 'creator' && stats.creator && (
          <>
            {/* Creator Metrics Summary */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Creator Dashboard</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div className="stat-card" style={{ padding: '24px' }}>
                  <div className="stat-val" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {stats.creator.contestsCreatedCount}
                  </div>
                  <div className="stat-label">Contests Hosted</div>
                </div>
                <div className="stat-card" style={{ padding: '24px' }}>
                  <div className="stat-val" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {stats.creator.problemsAuthoredCount}
                  </div>
                  <div className="stat-label">Problems Authored</div>
                </div>
              </div>
            </div>

            {/* Created Contests List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>My Created Contests</h3>
                <Link to="/creator" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}>
                  Manage Workspace
                </Link>
              </div>
              {stats.creator.contests.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You haven't created any contests yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="problems-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Contest Name</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Problems</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Registrations</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.creator.contests.map((c) => (
                        <tr key={c.id}>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)' }}>
                            <Link to={`/contests/${c.id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600' }}>
                              {c.title}
                            </Link>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center', fontSize: '14px' }}>
                            {c.problemsCount}
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                            {c.registrationsCount}
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center' }}>
                            <span className={`contest-status-badge status-${c.status.toLowerCase()}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Authored Problems List */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>Authored Problems</h3>
              {stats.creator.problems.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You haven't created any coding problems yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="problems-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Problem Title</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Difficulty</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Score Value</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.creator.problems.map((p) => (
                        <tr key={p._id}>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)' }}>
                            <Link to={`/problems/${p._id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600' }}>
                              {p.title}
                            </Link>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center' }}>
                            <span className={`difficulty-badge difficulty-${p.difficulty}`}>
                              {p.difficulty}
                            </span>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', textAlign: 'center', fontWeight: '600' }}>
                            {p.points} pts
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
