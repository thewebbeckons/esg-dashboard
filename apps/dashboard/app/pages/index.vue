<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats')
</script>

<template>
  <UContainer class="py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        ESG News Digest
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Local-first news scraper and summarizer for ESG topics
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <UIcon
              name="i-lucide-rss"
              class="w-6 h-6 text-green-600 dark:text-green-400"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Sources
            </p>
            <p class="text-2xl font-semibold">
              {{ stats?.sources ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <UIcon
              name="i-lucide-play-circle"
              class="w-6 h-6 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Runs
            </p>
            <p class="text-2xl font-semibold">
              {{ stats?.runs ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <UIcon
              name="i-lucide-newspaper"
              class="w-6 h-6 text-purple-600 dark:text-purple-400"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Articles
            </p>
            <p class="text-2xl font-semibold">
              {{ stats?.articles ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <UIcon
              name="i-lucide-tags"
              class="w-6 h-6 text-orange-600 dark:text-orange-400"
            />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Topics
            </p>
            <p class="text-2xl font-semibold">
              {{ stats?.topics ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="mt-8 flex gap-4">
      <UButton
        to="/sources"
        icon="i-lucide-plus"
        size="lg"
      >
        Add Source
      </UButton>
      <UButton
        to="/runs"
        icon="i-lucide-play"
        size="lg"
        variant="outline"
      >
        View Runs
      </UButton>
    </div>
  </UContainer>
</template>
