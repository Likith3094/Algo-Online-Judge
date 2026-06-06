import { useEffect, useState } from 'react';
import { createContest, createProblem, listProblems } from '../api/auth';

function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState('library'); // library, create-problem, launch-contest

  // Problem creation form states
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [points, setPoints] = useState(100);
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [authorCode, setAuthorCode] = useState('');
  const [tags, setTags] = useState('');
  const [isPrivateContestProblem, setIsPrivateContestProblem] = useState(false);

  // Contest creation form states
  const [contestTitle, setContestTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedProblems, setSelectedProblems] = useState([]);

  // Data library states
  const [problems, setProblems] = useState([]);
  
  // Notification states
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProblems = async () => {
    try {
      const response = await listProblems();
      if (response.data && Array.isArray(response.data.problems)) {
        setProblems(response.data.problems);
      } else if (Array.isArray(response.data)) {
        setProblems(response.data);
      }
    } catch (err) {
      setError('Could not load existing problems library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, []);

  const handleProblemToggle = (problemId) => {
    setSelectedProblems((current) =>
      current.includes(problemId) ? current.filter((id) => id !== problemId) : [...current, problemId]
    );
  };

  const handleCreateProblem = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const payload = {
        title: problemTitle.trim(),
        description: problemDescription.trim(),
        constraints: constraints.trim(),
        difficulty,
        points: Number(points),
        sampleInput: sampleInput.trim(),
        sampleOutput: sampleOutput.trim(),
        authorCode: authorCode.trim(),
        tags: tagArray,
        isPrivateContestProblem,
      };

      await createProblem(payload);
      setMessage('Problem saved successfully inside library database!');
      
      // Reset form fields
      setProblemTitle('');
      setProblemDescription('');
      setConstraints('');
      setDifficulty('Easy');
      setPoints(100);
      setSampleInput('');
      setSampleOutput('');
      setAuthorCode('');
      setTags('');
      setIsPrivateContestProblem(false);

      // Refresh list and return to library tab
      await loadProblems();
      setActiveTab('library');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save problem specifications. Double check input rules.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateContest = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (selectedProblems.length === 0) {
      setError('You must select at least one problem to include in this contest.');
      return;
    }

    setSubmitting(true);

    try {
      await createContest({
        title: contestTitle.trim(),
        startTime,
        endTime,
        problems: selectedProblems,
      });

      setMessage('Contest published successfully and listed in the marketplace!');
      setContestTitle('');
      setStartTime('');
      setEndTime('');
      setSelectedProblems([]);
      
      // Redirect back to problem library or dashboard if needed
      setActiveTab('library');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to publish contest. Confirm date logic.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="creator-container">
      <header className="page-header">
        <h1>Creator Workspace</h1>
        <p>Design challenging tasks, construct testing conditions, and schedule competitive rounds.</p>
      </header>

      {/* Workspace Tabs */}
      <div className="creator-tabs" style={{ marginBottom: '32px' }}>
        <button
          className={`creator-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('library');
            setError('');
            setMessage('');
          }}
        >
          Problem Library ({problems.length})
        </button>
        <button
          className={`creator-tab-btn ${activeTab === 'create-problem' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('create-problem');
            setError('');
            setMessage('');
          }}
        >
          Create Problem
        </button>
        <button
          className={`creator-tab-btn ${activeTab === 'launch-contest' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('launch-contest');
            setError('');
            setMessage('');
          }}
        >
          Launch Contest
        </button>
      </div>

      {error && (
        <div className="message-banner error" style={{ marginBottom: '24px' }}>
          <span>⚠️</span> {error}
        </div>
      )}
      {message && (
        <div className="message-banner success" style={{ marginBottom: '24px' }}>
          <span>✓</span> {message}
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'library' && (
        <div className="panel-card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: '700' }}>Manage Created Problems</h2>
          
          {loading ? (
            <div className="loading-wrapper" style={{ minHeight: '200px' }}>
              <div className="spinner"></div>
              <p className="loading-text">Retrieving problems...</p>
            </div>
          ) : problems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>No Problems Available</p>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>Start by creating your first challenge in the second tab.</p>
              <button className="btn-secondary" onClick={() => setActiveTab('create-problem')}>
                Create Problem
              </button>
            </div>
          ) : (
            <table className="problems-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Points Value</th>
                  <th>Visibility</th>
                  <th>Tags</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem._id}>
                    <td style={{ fontWeight: '600' }}>{problem.title}</td>
                    <td>
                      <span className={`difficulty-badge difficulty-${problem.difficulty}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{problem.points} pts</td>
                    <td>
                      <span className={`difficulty-badge ${problem.isPrivateContestProblem ? 'difficulty-Hard' : 'difficulty-Easy'}`}>
                        {problem.isPrivateContestProblem ? 'Contest Only' : 'Public'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {problem.tags?.length > 0 ? (
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
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(problem.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'create-problem' && (
        <div className="panel-card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: '700' }}>Describe New Algorithm Challenge</h2>
          <form onSubmit={handleCreateProblem}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="probTitle">Problem Title</label>
                <input
                  id="probTitle"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Spiral Matrix Traversal"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="form-row" style={{ gap: '20px', width: '100%' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="probDiff">Difficulty</label>
                  <select
                    id="probDiff"
                    className="form-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="probPoints">Points Score</label>
                  <input
                    id="probPoints"
                    type="number"
                    min="1"
                    max="1000"
                    className="form-input"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="probDesc">Description & Specifications</label>
              <textarea
                id="probDesc"
                rows="5"
                className="form-textarea"
                placeholder="Detail the problem instructions, logic parameters, expectations..."
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="probConstraints">Input/Output Constraints</label>
              <textarea
                id="probConstraints"
                rows="2"
                className="form-textarea"
                placeholder="e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="probInput">Sample Input Data</label>
                <textarea
                  id="probInput"
                  rows="3"
                  className="form-textarea"
                  placeholder="Sample input data as it would be read from standard input"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="probOutput">Sample Output Data</label>
                <textarea
                  id="probOutput"
                  rows="3"
                  className="form-textarea"
                  placeholder="Expected output data as printed to standard output"
                  value={sampleOutput}
                  onChange={(e) => setSampleOutput(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="probCode">Reference Solution Code (Creator's Implementation)</label>
              <textarea
                id="probCode"
                rows="6"
                className="form-textarea"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                placeholder="Provide a functional solution code in C++, Python, or Java..."
                value={authorCode}
                onChange={(e) => setAuthorCode(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="probTags">Metadata Tags (Comma separated)</label>
              <input
                id="probTags"
                type="text"
                className="form-input"
                placeholder="array, matrix, matrix-rotation, easy-traverse"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="probVisibility">Problem Visibility</label>
              <select
                id="probVisibility"
                className="form-select"
                value={isPrivateContestProblem ? 'private' : 'public'}
                onChange={(e) => setIsPrivateContestProblem(e.target.value === 'private')}
                disabled={submitting}
              >
                <option value="public">Public (Available in Practice Arena)</option>
                <option value="private">Private (Contest Only)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '10px' }}>
              {submitting ? 'Creating problem...' : 'Save Problem to Database'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'launch-contest' && (
        <div className="panel-card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: '700' }}>Schedule Competitive Coding Round</h2>
          
          <form onSubmit={handleCreateContest}>
            <div className="form-group">
              <label htmlFor="contTitle">Contest Title</label>
              <input
                id="contTitle"
                type="text"
                className="form-input"
                placeholder="e.g. Algo-Match Challenge Round #1"
                value={contestTitle}
                onChange={(e) => setContestTitle(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contStart">Start Time (Date/Time)</label>
                <input
                  id="contStart"
                  type="datetime-local"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contEnd">End Time (Date/Time)</label>
                <input
                  id="contEnd"
                  type="datetime-local"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Problem Library Selection Pane */}
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label style={{ marginBottom: '4px' }}>Assign Problems to Contest</label>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                Select the tasks from your problem library that participants will need to solve during this round.
              </p>

              {problems.length === 0 ? (
                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  There are no problems in your library. Please create at least one problem first.
                </div>
              ) : (
                <div className="problem-library-list">
                  {problems.map((problem) => {
                    const isChecked = selectedProblems.includes(problem._id);
                    return (
                      <div
                        key={problem._id}
                        className={`problem-select-card ${isChecked ? 'selected' : ''}`}
                        onClick={() => handleProblemToggle(problem._id)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled via card onClick
                          onClick={(e) => e.stopPropagation()} // Stop bubble triggers
                        />
                        <div className="problem-select-info">
                          <h4>{problem.title}</h4>
                          <p>
                            <span className={`difficulty-badge difficulty-${problem.difficulty}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                              {problem.difficulty}
                            </span>
                            <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>
                              {problem.points} pts
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || problems.length === 0}
              style={{ marginTop: '24px', width: '100%' }}
            >
              {submitting ? 'Scheduling contest...' : 'Publish Contest to Marketplace'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CreatorDashboard;
