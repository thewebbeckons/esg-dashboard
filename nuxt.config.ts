// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

const libPath = fileURLToPath(new URL('./lib', import.meta.url))
const prismaPath = fileURLToPath(new URL('./prisma/generated/prisma/client.ts', import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@onmax/nuxt-better-auth'],

  auth: {
    redirects: {
      login: '/login',
      guest: '/'
    }
  },

  routeRules: {
    '/login': { auth: 'guest' },
    '/**': { auth: 'user' }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  alias: {
    '@esg/core': libPath,
    '@esg/core/types': `${libPath}/types`,
    '@esg/core/llm': `${libPath}/llm`,
    '@esg/core/url': `${libPath}/url`,
    '@esg/core/extraction': `${libPath}/extraction`,
    '@esg/core/taxonomy': `${libPath}/taxonomy`,
    '@esg/core/prisma': `${libPath}/prisma`,
    '@esg/db': prismaPath
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || '',
    public: {
      digestRecipientOptions: process.env.DIGEST_RECIPIENT_OPTIONS || ''
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      asyncContext: true
    },
    alias: {
      '@esg/db': prismaPath
    },
    externals: {
      external: ['@prisma/adapter-pg', '@prisma/client']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
