// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import oxlint from 'eslint-plugin-oxlint';
import eslintConfigPrettier from 'eslint-plugin-prettier/recommended';

export default withNuxt(
  // 1. Oxlint integration - disables ESLint rules that conflict with oxlint
  ...oxlint.configs['flat/recommended'],
).append(eslintConfigPrettier, {
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        printWidth: 100,
        tabWidth: 2,
        endOfLine: 'lf',
      },
    ],
  },
});
