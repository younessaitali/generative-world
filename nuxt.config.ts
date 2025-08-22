// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'],
  alias: {
    '#client-services': './app/services',
    '#api-services': './server/api',
  },
  css: ['~/assets/css/main.css'],
  nitro: {
    experimental: {
      websocket: true,
    },
  },
});
