// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

/**
 * The dependency direction of AGENTS.md (Frontend), enforced by eslint-plugin-boundaries
 * (docs/adr/0005-eslint-boundaries.md): game -> components, api, domain; domain -> api;
 * components -> api for types only; api -> nothing. No library imports an app. A new library
 * takes its place here in the same change that adds it.
 */
const dependencyDirection = {
  plugins: { boundaries },
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
    'boundaries/elements': [
      { type: 'game', pattern: 'projects/game' },
      { type: 'api', pattern: 'projects/api' },
      { type: 'domain', pattern: 'projects/domain' },
      { type: 'components', pattern: 'projects/components' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'game', allow: ['game', 'components', 'api', 'domain'] },
          { from: 'domain', allow: ['domain', 'api'] },
          { from: 'components', allow: ['components'] },
          { from: 'components', allow: ['api'], importKind: 'type' },
          { from: 'api', allow: ['api'] },
        ],
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ['dist/', '.angular/', 'test-results/', 'playwright-report/', 'node_modules/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        // An element, or an attribute on the native <a> or <button> it is (docs/adr/0012).
        { type: ['element', 'attribute'], prefix: 'atw', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'atw', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/use-component-view-encapsulation': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // File per type: a component's template and styles live in name.html and name.scss.
    files: ['projects/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { template: 0, styles: 0, animations: 0 },
      ],
    },
  },
  { files: ['projects/**/*.ts'], ...dependencyDirection },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
