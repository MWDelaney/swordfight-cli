import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        crypto: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'indent': ['error', 2, {
        SwitchCase: 1,
        ignoredNodes: ['TemplateLiteral']
      }],
      'quotes': ['error', 'single', {
        allowTemplateLiterals: true,
        avoidEscape: true
      }],
      'semi': ['error', 'always'],
      'no-control-regex': 'off',
      'no-case-declarations': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/']
  }
];
