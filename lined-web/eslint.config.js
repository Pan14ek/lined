import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Feature code must consume the public Design System / patterns layer,
    // not the internal shadcn/Base UI primitives directly. See
    // docs/ARCHITECTURE.md, "The public Design System boundary".
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/ui/*', '@/components/ui'],
              message:
                'Feature code must consume the Lined public Design System (@/components/design-system/*) ' +
                'or patterns (@/components/patterns/*), not the internal shadcn/Base UI primitives directly.',
            },
            {
              group: ['@base-ui/react/*', '@base-ui/react'],
              message:
                'Feature code must not import Base UI directly. Use or extend a wrapper under ' +
                '@/components/design-system/* instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // The public Design System / patterns layer must stay domain-agnostic:
    // it may not depend on feature code (DTOs, hooks, API clients, ...).
    files: ['src/components/design-system/**/*.{ts,tsx}', 'src/components/patterns/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features'],
              message:
                'The public Design System and patterns layers must stay domain-agnostic. ' +
                'A component that needs a feature DTO/hook belongs in that feature as a domain wrapper.',
            },
          ],
        },
      ],
    },
  },
])
