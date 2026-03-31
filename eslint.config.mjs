import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const nodeCommonJs = {
  ecmaVersion: 2022,
  sourceType: 'commonjs',
  globals: {
    ...globals.node,
    require: 'readonly',
    module: 'writable',
    __dirname: 'readonly',
    __filename: 'readonly',
    exports: 'writable',
  },
};

export default tseslint.config(
  {
    ignores: ['.webpack/**', 'out/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.js', 'src/**/*.cjs', 'tests/**/*.cjs'],
    languageOptions: nodeCommonJs,
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['src/main.js', 'src/preload.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly',
        MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
      },
    },
  },
  {
    files: ['src/renderer.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: [
      'forge.config.js',
      'webpack.*.js',
      'webpack.rules.js',
      'postcss.config.js',
      'tailwind.config.js',
      'playwright.config.cjs',
    ],
    languageOptions: nodeCommonJs,
    rules: {
      'no-unused-vars': 'off',
    },
  },
);
