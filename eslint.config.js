import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scratch_check_*.js', 'scratch_check_*.cjs']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // These compiler-oriented rules currently misclassify event handlers in
      // this non-compiled React app. Keep the runtime hook correctness rules.
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/preserve-caught-error': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    files: ['vite.config.js', 'server.mjs', 'server/**/*.js', 'tests/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/workers/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.worker,
    },
  },
])
