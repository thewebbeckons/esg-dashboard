<script setup lang="ts">
const { user, loggedIn, signOut, ready } = useUserSession()

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

async function handleLogout() {
  await signOut({ redirect: '/login' })
}
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
            class="w-5 h-5 text-primary-500"
          />
          ESG News Digest
        </NuxtLink>
        <UNavigationMenu
          v-if="loggedIn"
          :items="navigation"
        />
      </template>
      <template #right>
        <template v-if="ready && loggedIn">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ user?.name || user?.email }}
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            size="sm"
            @click="handleLogout"
          >
            Logout
          </UButton>
        </template>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
