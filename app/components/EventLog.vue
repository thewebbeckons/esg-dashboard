<script setup lang="ts">
interface RunEvent {
  id: string
  ts: string
  level: string
  type: string
  message: string
}

defineProps<{
  events: RunEvent[]
  isLive?: boolean
}>()

function getEventColor(level: string) {
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
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          Event Log
        </h3>
        <div
          v-if="isLive"
          class="flex items-center gap-2 text-sm text-primary-500"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
          </span>
          Live
        </div>
      </div>
    </template>

    <div class="max-h-[500px] overflow-y-auto font-mono text-sm space-y-1">
      <div
        v-for="event in events"
        :key="event.id"
        class="flex gap-3 py-1 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
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
</template>
