<script setup lang="ts">
import type { Component } from 'vue'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface Article {
  id: string
  url: string
  canonicalUrl: string
  discoveredAt: string
  fetchedAt: string | null
  status: string
  source: { id: string, name: string, type: string }
  article: { id: string, title: string, publishedAt: string | null } | null
  analysis: { id: string, relevant: boolean, topics: string[], importance: number } | null
}

interface ArticlesResponse {
  items: Article[]
  total: number
}

interface Topic {
  id: string
  slug: string
  name: string
  enabled: boolean
}

const route = useRoute()
const router = useRouter()
const expanded = ref<Record<number, boolean>>({})
const isRerunning = ref(false)
const toast = useToast()

// Filters
const topicFilter = ref(route.query.topic as string || 'all')
const relevantFilter = ref(route.query.relevant as string || 'all')
const statusFilter = ref(route.query.status as string || 'all')

// Fetch topics for filter dropdown
const { data: topics } = await useFetch<Topic[]>('/api/topics')

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (topicFilter.value && topicFilter.value !== 'all') params.topic = topicFilter.value
  if (relevantFilter.value && relevantFilter.value !== 'all') params.relevant = relevantFilter.value
  if (statusFilter.value && statusFilter.value !== 'all') params.status = statusFilter.value
  return params
})

const { data, refresh } = await useFetch<ArticlesResponse>('/api/items', {
  query: queryParams
})

function applyFilters() {
  router.push({ query: queryParams.value })
  refresh()
}

function clearFilters() {
  topicFilter.value = 'all'
  relevantFilter.value = 'all'
  statusFilter.value = 'all'
  router.push({ query: {} })
  refresh()
}

async function rerunAllAnalysis() {
  if (!data.value?.items?.length) return

  // Get all analyzed item IDs from current view
  const analyzedItems = data.value.items.filter(item => item.status === 'analyzed')

  if (analyzedItems.length === 0) {
    toast.add({
      title: 'No items to reanalyze',
      description: 'No analyzed items found matching current filters.',
      color: 'warning'
    })
    return
  }

  // Confirm with user
  const confirmed = window.confirm(
    `Are you sure you want to reanalyze ${analyzedItems.length} items? ` +
    `This will delete their current analysis and re-process them.`
  )
  if (!confirmed) return

  isRerunning.value = true
  try {
    const itemIds = analyzedItems.map(item => item.id)
    const run = await $fetch<{ id: string }>('/api/runs/reanalyze', {
      method: 'POST',
      body: { itemIds }
    })

    toast.add({
      title: 'Reanalysis started',
      description: `Processing ${itemIds.length} items. View progress in Runs.`,
      color: 'success'
    })

    navigateTo(`/runs/${run.id}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.add({
      title: 'Failed to start reanalysis',
      description: message,
      color: 'error'
    })
  } finally {
    isRerunning.value = false
  }
}

function getRelevanceBadge(relevant: boolean | undefined) {
  if (relevant === true) return { color: 'success' as const, label: 'Relevant' }
  if (relevant === false) return { color: 'neutral' as const, label: 'Not Relevant' }
  return { color: 'warning' as const, label: 'Pending' }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'analyzed': return 'success'
    case 'extracted': return 'info'
    case 'fetched': return 'primary'
    case 'new': return 'warning'
    case 'skipped': return 'neutral'
    case 'failed': return 'error'
    default: return 'neutral'
  }
}

function getImportanceColor(importance: number) {
  if (importance > 80) return 'success'
  if (importance >= 50) return 'warning'
  return 'neutral'
}

const topicOptions = computed(() => [
  { label: 'All Topics', value: 'all' },
  ...(topics.value?.map(t => ({ label: t.name, value: t.slug })) || [])
])

const relevantOptions = [
  { label: 'All', value: 'all' },
  { label: 'Relevant Only', value: 'true' },
  { label: 'Not Relevant', value: 'false' }
]

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Analyzed', value: 'analyzed' },
  { label: 'Extracted', value: 'extracted' },
  { label: 'Fetched', value: 'fetched' },
  { label: 'New', value: 'new' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Failed', value: 'failed' }
]

const UButton = resolveComponent('UButton')

const columns: TableColumn<Article>[] = [
  {
    id: 'expand',
    cell: ({ row }) => h(UButton as Component, {
      color: 'neutral',
      variant: 'ghost',
      icon: 'i-lucide-chevron-down',
      size: 'xs',
      square: true,
      'aria-label': 'Expand',
      ui: {
        leadingIcon: [
          'transition-transform',
          row.getIsExpanded() ? 'duration-200 rotate-180' : ''
        ]
      },
      onClick: () => row.toggleExpanded()
    })
  },
  { id: 'title', accessorKey: 'article', header: 'Title' },
  { id: 'source', accessorKey: 'source', header: 'Source' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'relevant', accessorKey: 'analysis', header: 'Relevance' },
  { id: 'topics', accessorKey: 'analysis', header: 'Topics' },
  { id: 'importance', accessorKey: 'analysis', header: 'Importance' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
  <UContainer class="py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Articles
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          {{ data?.total || 0 }} articles discovered
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="warning"
        variant="soft"
        :loading="isRerunning"
        @click="rerunAllAnalysis"
      >
        Rerun Analysis
      </UButton>
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <UFormField label="Topic">
          <USelect v-model="topicFilter" :items="topicOptions" class="w-48" />
        </UFormField>

        <UFormField label="Relevance">
          <USelect v-model="relevantFilter" :items="relevantOptions" class="w-40" />
        </UFormField>

        <UFormField label="Status">
          <USelect v-model="statusFilter" :items="statusOptions" class="w-40" />
        </UFormField>

        <div class="flex gap-2">
          <UButton @click="applyFilters">
            Apply
          </UButton>
          <UButton variant="ghost" @click="clearFilters">
            Clear
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Articles Table -->
    <UCard>
      <UTable v-model:expanded="expanded" :columns="columns" :data="data?.items || []">
        <template #title-cell="{ row }">
          <div class="max-w-xs">
            <NuxtLink :to="`/articles/${row.original.id}`"
              class="font-medium text-success-600 hover:text-success-700 hover:underline line-clamp-1">
              {{ row.original.article?.title || 'Untitled' }}
            </NuxtLink>
            <div class="text-xs text-gray-400 truncate">
              {{ row.original.canonicalUrl }}
            </div>
          </div>
        </template>

        <template #source-cell="{ row }">
          <span class="text-gray-600">{{ row.original.source.name }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)" variant="subtle" class="capitalize">
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #relevant-cell="{ row }">
          <UBadge :color="getRelevanceBadge(row.original.analysis?.relevant).color" variant="subtle">
            {{ getRelevanceBadge(row.original.analysis?.relevant).label }}
          </UBadge>
        </template>

        <template #topics-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="topic in (row.original.analysis?.topics || []).slice(0, 3)"
              :key="topic"
              color="info"
              variant="soft"
            >
              {{ topic }}
            </UBadge>
            <span
              v-if="(row.original.analysis?.topics?.length || 0) > 3"
              class="text-xs text-gray-400"
            >
              +{{ (row.original.analysis?.topics?.length || 0) - 3 }}
            </span>
          </div>
        </template>

        <template #importance-cell="{ row }">
          <UTooltip
            v-if="row.original.analysis?.importance != null"
            :text="`${row.original.analysis.importance}/100`"
          >
            <UProgress
              :model-value="Number(row.original.analysis.importance)"
              :max="100"
              :color="getImportanceColor(row.original.analysis.importance)"
              size="sm"
              class="w-20"
            />
          </UTooltip>
          <span
            v-else
            class="text-gray-400"
          >
            -
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-external-link"
            variant="ghost"
            size="sm"
            :href="row.original.url"
            target="_blank"
          />
        </template>

        <template #expanded="{ row }">
          <div class="p-4 bg-neutral-50 dark:bg-neutral-800/50">
            <div class="space-y-2">
              <div>
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Full Title</span>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ row.original.article?.title || 'Untitled' }}
                </p>
              </div>
              <div>
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">URL</span>
                <p class="text-sm">
                  <a
                    :href="row.original.url"
                    target="_blank"
                    class="text-success-600 hover:text-success-700 hover:underline break-all"
                  >
                    {{ row.original.url }}
                  </a>
                </p>
              </div>
              <div v-if="row.original.article?.publishedAt">
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Published</span>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ new Date(row.original.article.publishedAt).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </UTable>

      <div
        v-if="!data?.items?.length"
        class="text-center py-12 text-gray-500"
      >
        No articles found. Run a scrape job to discover articles.
      </div>
    </UCard>
  </UContainer>
</template>
