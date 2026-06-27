import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    dedupe: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/autocomplete',
      '@lezer/common',
      '@lezer/highlight',
      '@lezer/lr',
    ]
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/autocomplete',
      '@codemirror/lang-cpp',
      '@codemirror/lang-java',
      '@codemirror/lang-python',
      '@lezer/common',
      '@lezer/highlight',
      '@lezer/lr',
      '@uiw/react-codemirror',
      '@uiw/codemirror-theme-vscode',
      '@uiw/codemirror-theme-github',
    ]
  }
});
