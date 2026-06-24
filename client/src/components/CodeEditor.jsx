import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';

import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import { useTheme } from '../context/ThemeContext';

/**
 * CodeEditor component wraps @uiw/react-codemirror with language support.
 * It receives the current code value, a change callback,
 * the selected language, and optional read‑only state.
 */
const CodeEditor = ({
  value,
  onChange,
  language = 'cpp',
  readOnly = false,
  height = '300px',
}) => {
  const { theme } = useTheme();

  // Map language identifiers to corresponding CodeMirror extensions
  const getLangExtension = (lang) => {
    switch (lang) {
      case 'cpp':
        return cpp();
      case 'java':
        return java();
      case 'python':
        return python();
      default:
        return cpp(); // fallback
    }
  };

  const extensions = [getLangExtension(language)];
  const editorTheme = theme === 'light' ? githubLight : vscodeDark;

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      onChange={(val) => onChange(val)}
      readOnly={readOnly}
      height={height}
      theme={editorTheme}
      basicSetup={{
        lineNumbers: true,
        closeBrackets: true,
        foldGutter: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        autocompletion: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true
      }}
      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
    />
  );
};

export default CodeEditor;
