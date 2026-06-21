import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getProblem, submitSolution } from '../api/auth';

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

  const [problem, setProblem] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editor state
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(codeTemplates.cpp);
  const [consoleLogs, setConsoleLogs] = useState('Console ready. Write code and hit "Submit Solution".');
  const [submitting, setSubmitting] = useState(false);

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

  const simulateSubmit = async () => {
    setSubmitting(true);
    setConsoleLogs('> Submitting code to Docker sandbox...\n');
    try {
      const response = await submitSolution(id, {
        code,
        language,
        contestId,
      });

      if (response.data?.success) {
        const { verdict, executionTime, failedTestCase } = response.data;
        let logs = `> Execution Finished.\n> Verdict: ${verdict}\n> Max Execution Time: ${executionTime} ms\n`;
        if (verdict === 'AC') {
          logs += `> Status: SUCCESS. All test cases passed! `;
        } else if (verdict === 'WA') {
          logs += `> Status: FAILED. Wrong Answer on Test Case ${failedTestCase.index}.\n`;
          if (failedTestCase.input) {
            logs += `> Input:\n${failedTestCase.input}\n`;
          }
          if (failedTestCase.expected) {
            logs += `> Expected Output:\n${failedTestCase.expected}\n`;
          }
          if (failedTestCase.actual) {
            logs += `> Actual Output:\n${failedTestCase.actual}\n`;
          }
        } else if (verdict === 'TLE') {
          logs += `> Status: TIMEOUT. Time Limit Exceeded (TLE) on Test Case ${failedTestCase.index}.\n`;
        } else if (verdict === 'CE') {
          logs += `> Status: COMPILATION ERROR on Test Case ${failedTestCase.index}.\n`;
          if (failedTestCase.error) {
            logs += `> Error Details:\n${failedTestCase.error}\n`;
          }
        } else if (verdict === 'RE') {
          logs += `> Status: RUNTIME ERROR on Test Case ${failedTestCase.index}.\n`;
          if (failedTestCase.error) {
            logs += `> Error Details:\n${failedTestCase.error}\n`;
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

      <div className="detail-layout">
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

            {/* Editor Textarea with line numbers */}
            <div className="editor-body">
              <div className="editor-lines">
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>
              <textarea
                className="editor-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                spellCheck="false"
              />
            </div>

            {/* Actions panel */}
            <div className="editor-footer">
              <button
                className="btn-primary"
                onClick={simulateSubmit}
                disabled={submitting}
                style={{ minWidth: '150px' }}
              >
                {submitting ? 'Running...' : 'Submit Solution'}
              </button>
            </div>

            {/* Simulation Terminal Console */}
            <div className="editor-console">
              <div className="console-title">Execution Logs</div>
              <pre className="console-output">{consoleLogs}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemDetails;
