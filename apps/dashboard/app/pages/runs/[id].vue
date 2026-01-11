<script setup lang="ts">
import type { RunStatus, EventLevel, EventType } from '@esg/core'

interface RunEvent {
  id: string
  runId: string
  ts: string
  level: EventLevel
  type: EventType | string
  message: string
  data: Record<string, unknown> | null
}

interface RunDetail {
  id: string
  status: RunStatus
  sourceIds: string[] | null
  itemIds: string[] | null
  startedAt: string | null
  finishedAt: string | null
  triggeredBy: string | null
  createdAt: string
  eventCount: number
  eventSummary: Record<string, number>
  type: string
}

const route = useRoute()
const runId = route.params.id as string

const { data: run, refresh: refreshRun } = await useFetch<RunDetail>(`/api/runs/${runId}`)
const events = ref<RunEvent[]>([])
const isStreaming = ref(false)
const eventsContainer = ref<HTMLElement | null>(null)

// Timer state
const elapsedSeconds = ref(0)
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)

// Track article completion times for ETA calculation
const articleCompletionTimes = ref<number[]>([])
const lastDoneCount = ref(0)

// Fetch initial events
const { data: initialEvents } = await useFetch<RunEvent[]>(`/api/runs/${runId}/events`)
events.value = initialEvents.value || []

// Start timer when run is active
function startTimer() {
  if (timerInterval.value) return

  timerInterval.value = setInterval(() => {
    if (run.value?.startedAt) {
      const start = new Date(run.value.startedAt).getTime()
      const now = Date.now()
      elapsedSeconds.value = Math.floor((now - start) / 1000)
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

// Initialize elapsed time from server data
watch(() => run.value?.startedAt, (startedAt) => {
  if (startedAt) {
    const start = new Date(startedAt).getTime()
    const end = run.value?.finishedAt ? new Date(run.value.finishedAt).getTime() : Date.now()
    elapsedSeconds.value = Math.floor((end - start) / 1000)
  }
}, { immediate: true })

// Start/stop timer based on run status
watch(() => run.value?.status, (status) => {
  if (status === 'running') {
    startTimer()
  } else {
    stopTimer()
  }
}, { immediate: true })

// Track when articles complete for ETA calculation
watch(() => run.value?.eventSummary?.DONE, (doneCount) => {
  if (doneCount && doneCount > lastDoneCount.value && elapsedSeconds.value > 0) {
    // Record the time when each article completes
    articleCompletionTimes.value.push(elapsedSeconds.value)
    lastDoneCount.value = doneCount
  }
}, { immediate: true })

// Cleanup timer on unmount
onUnmounted(() => {
  stopTimer()
})

// Start SSE stream if run is active
watch(() => run.value?.status, (status) => {
  if (status === 'queued' || status === 'running') {
    startEventStream()
  }
}, { immediate: true })

function startEventStream() {
  if (isStreaming.value) return
  isStreaming.value = true

  const eventSource = new EventSource(`/api/runs/${runId}/events?stream=true`)

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)

      if (data.type === 'STREAM_END') {
        eventSource.close()
        isStreaming.value = false
        refreshRun()
        return
      }

      // Add event if not already present
      if (!events.value.find(ev => ev.id === data.id)) {
        events.value.push(data)

        // Auto-scroll to bottom
        nextTick(() => {
          if (eventsContainer.value) {
            eventsContainer.value.scrollTop = eventsContainer.value.scrollHeight
          }
        })
      }
    } catch (err) {
      console.error('SSE parse error:', err)
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    isStreaming.value = false
  }
}

function getStatusColor(status: RunStatus) {
  switch (status) {
    case 'queued': return 'warning'
    case 'running': return 'info'
    case 'succeeded': return 'success'
    case 'failed': return 'error'
    case 'canceled': return 'neutral'
    default: return 'neutral'
  }
}

function getEventColor(level: EventLevel) {
  switch (level) {
    case 'debug': return 'text-gray-400'
    case 'info': return 'text-blue-500'
    case 'warn': return 'text-yellow-500'
    case 'error': return 'text-red-500'
    default: return 'text-gray-500'
  }
}

function getEventIcon(type: string) {
  switch (type) {
    case 'DISCOVER': return 'i-lucide-search'
    case 'FETCH': return 'i-lucide-download'
    case 'EXTRACT': return 'i-lucide-file-text'
    case 'PREFILTER': return 'i-lucide-filter'
    case 'CLASSIFY': return 'i-lucide-tags'
    case 'SUMMARIZE': return 'i-lucide-list'
    case 'DONE': return 'i-lucide-check-circle'
    case 'ERROR': return 'i-lucide-alert-circle'
    default: return 'i-lucide-circle'
  }
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

// Count total articles to process
const totalArticles = computed(() => {
  const summary = run.value?.eventSummary || {}
  // For reanalysis runs, we know the count from itemIds
  // For discovery runs, count unique FETCH events (each article gets fetched once)
  // FETCH count is a good proxy for total articles being processed
  return summary.FETCH || summary.DONE || 0
})

// Count completed articles (DONE events)
const completedArticles = computed(() => {
  return run.value?.eventSummary?.DONE || 0
})

// Progress as percentage of completed articles
const progressValue = computed(() => {
  if (!run.value) return 0
  if (run.value.status === 'succeeded') return 100
  if (run.value.status === 'failed' || run.value.status === 'canceled') return 100

  if (totalArticles.value === 0) return 0
  return Math.floor((completedArticles.value / totalArticles.value) * 100)
})

// Elapsed time formatted
const elapsedDisplay = computed(() => formatDuration(elapsedSeconds.value))

// Estimated time remaining
const estimatedRemaining = computed(() => {
  if (completedArticles.value === 0 || totalArticles.value === 0) return null
  if (run.value?.status !== 'running') return null

  const remaining = totalArticles.value - completedArticles.value
  if (remaining <= 0) return null

  // Average time per article
  const avgTimePerArticle = elapsedSeconds.value / completedArticles.value
  const estimatedSeconds = Math.ceil(avgTimePerArticle * remaining)

  return formatDuration(estimatedSeconds)
})

// Progress text (e.g., "5/20 articles")
const progressText = computed(() => {
  if (totalArticles.value === 0) {
    return run.value?.status === 'queued' ? 'Waiting...' : 'Discovering...'
  }
  return `${completedArticles.value}/${totalArticles.value} articles`
})
</script>

<template>
  <UContainer class="py-10">
    <div class="mb-8">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/runs"
        class="mb-4"
      >
        Back to Runs
      </UButton>

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Run Details
            <UBadge
              :color="getStatusColor(run?.status || 'queued')"
              size="lg"
            >
              {{ run?.status || 'loading' }}
            </UBadge>
            <UBadge
              v-if="run?.type === 'reanalysis'"
              color="warning"
              variant="outline"
            >
              Reanalysis
            </UBadge>
          </h1>
          <p class="mt-1 text-gray-600 dark:text-gray-400">
            {{ run?.id }}
          </p>
        </div>

        <!-- Timer Display -->
        <div class="text-right">
          <div class="flex items-center gap-2 text-2xl font-mono font-bold text-gray-900 dark:text-white">
            <UIcon
              name="i-lucide-clock"
              class="w-6 h-6 text-gray-400"
            />
            {{ elapsedDisplay }}
          </div>
          <div
            v-if="estimatedRemaining"
            class="text-sm text-gray-500 mt-1"
          >
            ~{{ estimatedRemaining }} remaining
          </div>
          <div
            v-else-if="run?.status === 'succeeded'"
            class="text-sm text-success-500 mt-1"
          >
            Completed
          </div>
          <div
            v-else-if="run?.status === 'failed'"
            class="text-sm text-error-500 mt-1"
          >
            Failed
          </div>
        </div>
      </div>
    </div>

    <!-- Progress -->
    <UCard class="mb-6">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ progressText }}
            </span>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ progressValue }}%
            </span>
          </div>
          <UProgress
            :model-value="progressValue"
            :color="getStatusColor(run?.status || 'queued')"
            size="lg"
          />
        </div>
      </div>
    </UCard>

    <!-- Event Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <UCard
        v-for="(count, type) in run?.eventSummary"
        :key="type"
        class="text-center"
      >
        <UIcon
          :name="getEventIcon(String(type))"
          class="w-6 h-6 mx-auto mb-2 text-gray-400"
        />
        <div class="text-2xl font-bold">
          {{ count }}
        </div>
        <div class="text-sm text-gray-500">
          {{ type }}
        </div>
      </UCard>
    </div>

    <!-- Event Stream -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            Event Log
          </h3>
          <div
            v-if="isStreaming"
            class="flex items-center gap-2 text-sm text-green-500"
          >
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </div>
        </div>
      </template>

      <div
        ref="eventsContainer"
        class="max-h-[500px] overflow-y-auto font-mono text-sm space-y-1"
      >
        <div
          v-for="event in events"
          :key="event.id"
          class="flex gap-3 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        >
          <span class="text-gray-400 shrink-0">{{ formatTime(event.ts) }}</span>
          <UIcon
            :name="getEventIcon(event.type)"
            :class="getEventColor(event.level)"
            class="w-4 h-4 shrink-0 mt-0.5"
          />
          <span
            :class="getEventColor(event.level)"
            class="shrink-0 w-20"
          >
            {{ event.type }}
          </span>
          <span class="text-gray-700 dark:text-gray-300 flex-1">
            {{ event.message }}
          </span>
        </div>

        <div
          v-if="!events.length"
          class="text-center py-8 text-gray-500"
        >
          Waiting for events...
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
