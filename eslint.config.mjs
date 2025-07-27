// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import oxlint from 'eslint-plugin-oxlint'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  // Oxlint integration - disables ESLint rules that conflict with oxlint
  ...oxlint.configs['flat/recommended'],

  // Prettier integration - disables ESLint rules that conflict with Prettier
  prettier,
)
