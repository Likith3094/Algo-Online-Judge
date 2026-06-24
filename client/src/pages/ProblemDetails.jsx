import { useEffect, useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getProblem, submitSolution, runSolution } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const codeTemplates = {
  cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

// Solve the problem here
void solve() {
    
}

int main() {
    solve();
    return 0;
}`,
  python: `def solve():
    # Write your solution here
    pass

if __name__ == "__main__":
    solve()`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        // Write your solution here
    }
}`
};

function ProblemDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contest');
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('unsolved');
  
  // Editor state
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(codeTemplates.cpp);
  const [consoleLogs, setConsoleLogs] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Theme layout workspace states
  const [leftWidthPercent, setLeftWidthPercent] = useState(50); // Width of left panel (out of 100)
  const [customInputEnabled, setCustomInputEnabled] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [runningCustom, setRunningCustom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDragging) return;
      const detailLayout = document.querySelector('.detail-layout');
      if (detailLayout) {
        const rect = detailLayout.getBoundingClientRect();
        const offset = e.clientX - rect.left;
        const percentage = (offset / rect.width) * 100;
        
        // Constrain percentage between 20% and 80%
        if (percentage >= 20 && percentage <= 80) {
          setLeftWidthPercent(percentage);
        }
      }
    };

    const handleDragEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleDragMove);
      window.addEventListener('pointerup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    const loadProblem = async () => {
      try {
        const response = await getProblem(id);
        if (response.data?.success) {
          setProblem(response.data.problem);
          setSamples(response.data.sampleTestCases || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch problem details.');
      } finally {
        setLoading(false);
      }
    };
    loadProblem();
  }, [id]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(codeTemplates[lang]);
  };

  const handleRunCustom = async () => {
    setRunningCustom(true);
    setConsoleLogs('> Compiling & Running code ...\n');
    try {
      const response = await runSolution(id, {
        code,
        language,
        customInput,
      });

      if (response.data?.success) {
        const { verdict, output, error: execError } = response.data;
        let logs = '';
        if (verdict === 'Run Successful') {
          logs = `Output:\n${output || '[No Output]'}\n`;
        } else {
          logs = `${verdict}\n`;
          if (execError) {
            logs += `Error:\n${execError}\n`;
          }
        }
        setConsoleLogs(logs);
      }
    } catch (err) {
      setConsoleLogs(`> Error: ${err.response?.data?.message || err.message || 'Run failed.'}`);
    } finally {
      setRunningCustom(false);
    }
  };

  const simulateSubmit = async () => {
    setSubmitting(true);
    setConsoleLogs('> Submitting...\n');
    try {
      const response = await submitSolution(id, {
        code,
        language,
        contestId,
      });

      if (response.data?.success) {
        const { verdict, failedTestCase } = response.data;
        let logs = '';
        if (verdict === 'AC') {
          logs = `Accepted\nAll test cases passed!`;
        } else if (verdict === 'WA') {
          logs = `Wrong Answer\n\n`;
          if (failedTestCase.expected) {
            logs += `Expected Output:\n${failedTestCase.expected}\n\n`;
          }
          if (failedTestCase.actual) {
            logs += `Actual Output:\n${failedTestCase.actual}\n`;
          }
        } else if (verdict === 'TLE') {
          logs = `Time Limit Exceeded\n`;
        } else if (verdict === 'CE') {
          logs = `Compilation Error\n\n`;
          if (failedTestCase.error) {
            logs += `${failedTestCase.error}\n`;
          }
        } else if (verdict === 'RE') {
          logs = `Runtime Error\n\n`;
          if (failedTestCase.error) {
            logs += `${failedTestCase.error}\n`;
          }
        }
        setConsoleLogs(logs);
      }
    } catch (err) {
      setConsoleLogs(`> Error: ${err.response?.data?.message || err.message || 'Submission failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Solve button handler – runs solution against default tests (no custom input)
  const handleSolve = async () => {
    setSubmitting(true);
    setConsoleLogs('> Solving using default test cases...\n');
    try {
      const response = await runSolution(id, {
        code,
        language,
        // No customInput field means backend will use built‑in sample tests
      });
      if (response.data?.success) {
        const { verdict, output, error: execError } = response.data;
        let logs = '';
        if (verdict === 'Run Successful') {
          logs = `Output:\n${output || '[No Output]'}\n`;
        } else {
          logs = `${verdict}\n`;
          if (execError) {
            logs += `Error:\n${execError}\n`;
          }
        }
        setConsoleLogs(logs);
      }
    } catch (err) {
      setConsoleLogs(`> Error: ${err.response?.data?.message || err.message || 'Solve failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p className="loading-text">Loading problem description...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="panel-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="message-banner error">⚠️ {error || 'Problem not found.'}</div>
        <Link to="/dashboard" className="btn-secondary" style={{ marginTop: '20px' }}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  // Calculate line numbers to display in gutter
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 15) }, (_, i) => i + 1);

  const isBusy = submitting || runningCustom;

  return (
    <div className="problem-details-container">
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to={contestId ? `/contests/${contestId}` : '/dashboard'}
          style={{ textDecoration: 'none', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
        >
          ← Back to {contestId ? 'Contest Workspace' : 'Contests Marketplace'}
        </Link>
      </div>

      <div className="detail-layout" style={{ gridTemplateColumns: `${leftWidthPercent}% 12px calc(${100 - leftWidthPercent}% - 12px)` }}>
        {/* Left Side: Problem Description */}
        <div className="problem-panel">
          <div className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className={`difficulty-badge difficulty-${problem.difficulty}`} style={{ marginRight: '10px' }}>
                  {problem.difficulty}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                  Value: {problem.points || 100} Points
                </span>
              </div>
              {problem.tags && problem.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {problem.tags.map((t) => (
                    <span key={t} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-secondary)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '20px' }}>{problem.title}</h1>
            
            <div className="problem-section-title">Description</div>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginBottom: '24px', lineHeight: '1.7' }}>
              {problem.description}
            </p>

            <div className="problem-section-title">Constraints</div>
            <p className="code-block" style={{ marginBottom: '24px' }}>
              {problem.constraints}
            </p>

            <div className="problem-section-title">Sample Cases</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Sample Input
                </div>
                <div className="code-block">{problem.sampleInput}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Sample Output
                </div>
                <div className="code-block">{problem.sampleOutput}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Divider resizer */}
        <div className={`workspace-resizer ${isDragging ? 'dragging' : ''}`} onPointerDown={handleDragStart} />

        {/* Right Side: Interactive IDE Code Editor */}
        <div className="editor-panel">
          <div className="editor-card">
            {/* Header controls */}
            <div className="editor-header">
              <div className="editor-title">{language === 'cpp' ? 'code.cpp' : language === 'python' ? 'code.py' : 'code.java'}</div>
              
              <select className="editor-select" value={language} onChange={handleLanguageChange}>
                <option value="cpp">C++ (GCC 11)</option>
                <option value="python">Python (3.10)</option>
                <option value="java">Java (OpenJDK 17)</option>
              </select>
            </div>

            {/* Editor Textarea with CodeMirror */}
            <div className="editor-body">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                readOnly={isBusy}
                height="100%"
              />
            </div>

            {/* Custom Input Block */}
            <div className="editor-custom-input-section" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--editor-console-bg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', userSelect: 'none', color: 'var(--text)' }}>
                <input 
                  type="checkbox" 
                  checked={customInputEnabled} 
                  onChange={(e) => setCustomInputEnabled(e.target.checked)} 
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                Use Custom Test Case Input
              </label>
              
              {customInputEnabled && (
                <textarea
                  className="code-block"
                  style={{ width: '100%', height: '80px', marginTop: '10px', padding: '10px', fontSize: '13px', resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                  placeholder="Enter custom input data here..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  disabled={isBusy}
                />
              )}
            </div>

            {/* Actions panel */}
            <div className="editor-footer">
              {user ? (
                <>
                  <button
                    className="btn-primary"
                    onClick={handleRunCustom}
                    disabled={isBusy}
                    style={{ marginRight: 'auto', minWidth: '110px' }}
                  >
                    {runningCustom ? 'Running...' : 'Run Code'}
                  </button>

                  <button
                    className="btn-primary"
                    onClick={simulateSubmit}
                    disabled={isBusy}
                    style={{ minWidth: '150px' }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Solution'}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to run and submit your code</span>
                  <Link to="/login" className="btn-primary" style={{ padding: '10px 28px', fontSize: '14px', textDecoration: 'none' }}>
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Simulation Terminal Console */}
            <div className="editor-console">
              <div className="console-title">Output</div>
              <pre className="console-output">{consoleLogs}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemDetails;
