<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'ESG News Digest'

useSeoMeta({
  title,
  description: 'Local-first ESG news scraper and summarizer'
})

const navigation = [
  { label: 'Sources', to: '/sources', icon: 'i-lucide-rss' },
  { label: 'Runs', to: '/runs', icon: 'i-lucide-play-circle' },
  { label: 'Articles', to: '/articles', icon: 'i-lucide-newspaper' },
  { label: 'Digest', to: '/digest', icon: 'i-lucide-mail' }
]
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <UIcon
            name="i-lucide-leaf"
            class="w-5 h-5 text-green-600"
          />
          ESG News Digest
        </NuxtLink>
        <UNavigationMenu :items="navigation" />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
