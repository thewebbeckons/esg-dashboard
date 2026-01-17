<script setup lang="ts">
interface ArticleDetail {
  id: string
  url: string
  canonicalUrl: string
  discoveredAt: string
  fetchedAt: string | null
  status: string
  source: { id: string, name: string, type: string }
  article: {
    id: string
    title: string
    author: string | null
    publishedAt: string | null
    html: string | null
    text: string
    language: string | null
  } | null
  analysis: {
    id: string
    relevant: boolean
    topics: string[]
    importance: number
    summaryBullets: string[]
    whyItMatters: string
    modelVersion: string
    createdAt: string
  } | null
}

const route = useRoute()
const itemId = route.params.id as string

const { data: item } = await useFetch<ArticleDetail>(`/api/items/${itemId}`)

const showRawText = ref(false)

function getImportanceColor(importance: number) {
  if (importance > 80) return 'success'
  if (importance >= 50) return 'warning'
  return 'neutral'
}
</script>

<template>
  <UContainer class="py-10">
    <UButton
      variant="ghost"
      icon="i-lucide-arrow-left"
      to="/articles"
      class="mb-4"
    >
      Back to Articles
    </UButton>

    <template v-if="item">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ item.article?.title || 'Untitled Article' }}
        </h1>

        <div class="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
          <span class="flex items-center gap-1">
            <UIcon
              name="i-lucide-globe"
              class="w-4 h-4"
            />
            {{ item.source.name }}
          </span>

          <span
            v-if="item.article?.author"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-user"
              class="w-4 h-4"
            />
            {{ item.article.author }}
          </span>

          <span
            v-if="item.article?.publishedAt"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-calendar"
              class="w-4 h-4"
            />
            {{ new Date(item.article.publishedAt).toLocaleDateString() }}
          </span>

          <UButton
            icon="i-lucide-external-link"
            variant="ghost"
            size="sm"
            :href="item.url"
            target="_blank"
          >
            View Original
          </UButton>
        </div>
      </div>

      <!-- Analysis -->
      <UCard
        v-if="item.analysis"
        class="mb-6"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              AI Analysis
            </h3>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <UIcon
                name="i-lucide-cpu"
                class="w-4 h-4"
              />
              {{ item.analysis.modelVersion }}
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Relevance & Importance -->
          <div class="flex flex-wrap gap-6">
            <div>
              <div class="text-sm text-gray-500 mb-1">
                Relevance
              </div>
              <UBadge
                :color="item.analysis.relevant ? 'success' : 'neutral'"
                size="lg"
              >
                {{ item.analysis.relevant ? 'Relevant' : 'Not Relevant' }}
              </UBadge>
            </div>

            <div>
              <div class="text-sm text-gray-500 mb-1">
                Importance
              </div>
              <div class="flex items-center gap-3">
                <UProgress
                  :model-value="Number(item.analysis.importance)"
                  :max="100"
                  :color="getImportanceColor(item.analysis.importance)"
                  class="w-32"
                />
                <span class="font-semibold">{{ item.analysis.importance }}/100</span>
              </div>
            </div>
          </div>

          <!-- Topics -->
          <div>
            <div class="text-sm text-gray-500 mb-2">
              Topics
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="topic in item.analysis.topics"
                :key="topic"
                color="info"
                variant="soft"
              >
                {{ topic }}
              </UBadge>
            </div>
          </div>

          <!-- Summary Bullets -->
          <div>
            <div class="text-sm text-gray-500 mb-2">
              Key Takeaways
            </div>
            <ul class="space-y-2">
              <li
                v-for="(bullet, i) in item.analysis.summaryBullets"
                :key="i"
                class="flex gap-2"
              >
                <UIcon
                  name="i-lucide-check"
                  class="w-5 h-5 text-primary-500 shrink-0 mt-0.5"
                />
                <span>{{ bullet }}</span>
              </li>
            </ul>
          </div>

          <!-- Why It Matters -->
          <div>
            <div class="text-sm text-gray-500 mb-2">
              Why It Matters
            </div>
            <UAlert
              color="success"
              variant="subtle"
              icon="i-lucide-lightbulb"
              :description="item.analysis.whyItMatters"
            />
          </div>
        </div>
      </UCard>

      <!-- No Analysis -->
      <UAlert
        v-else
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Not Yet Analyzed"
        description="This article has not been processed by the AI yet. Run a scrape job to analyze it."
        class="mb-6"
      />

      <!-- Extracted Text -->
      <UCard v-if="item.article?.text">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              Extracted Content
            </h3>
            <UButton
              :icon="showRawText ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              variant="ghost"
              size="sm"
              @click="showRawText = !showRawText"
            >
              {{ showRawText ? 'Collapse' : 'Expand' }}
            </UButton>
          </div>
        </template>

        <div
          v-if="showRawText"
          class="prose prose-green dark:prose-invert max-w-none whitespace-pre-wrap"
        >
          {{ item.article.text }}
        </div>
        <div
          v-else
          class="text-gray-500"
        >
          {{ item.article.text.slice(0, 500) }}...
          <span class="text-sm">({{ item.article.text.length.toLocaleString() }} characters)</span>
        </div>
      </UCard>
    </template>

    <UAlert
      v-else
      color="error"
      icon="i-lucide-alert-circle"
      title="Article Not Found"
      description="The requested article could not be found."
    />
  </UContainer>
</template>
