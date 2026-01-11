<script setup lang="ts">
import type { RunStatus } from '@esg/core'

interface Run {
  id: string
  status: RunStatus
  sourceIds: string[] | null
  startedAt: string | null
  finishedAt: string | null
  triggeredBy: string | null
  createdAt: string
  eventCount: number
}

interface RunsResponse {
  runs: Run[]
  total: number
}

const { data, refresh } = await useFetch<RunsResponse>('/api/runs')
const isRunning = ref(false)

async function startRun() {
  isRunning.value = true
  try {
    const run = await $fetch<Run>('/api/runs', { method: 'POST' })
    await refresh()
    navigateTo(`/runs/${run.id}`)
  } finally {
    isRunning.value = false
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

function getStatusIcon(status: RunStatus) {
  switch (status) {
    case 'queued': return 'i-lucide-clock'
    case 'running': return 'i-lucide-loader-2'
    case 'succeeded': return 'i-lucide-check-circle'
    case 'failed': return 'i-lucide-x-circle'
    case 'canceled': return 'i-lucide-ban'
    default: return 'i-lucide-circle'
  }
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) return '-'
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

const columns = [
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'createdAt', accessorKey: 'createdAt', header: 'Created' },
  { id: 'duration', accessorKey: 'startedAt', header: 'Duration' },
  { id: 'triggeredBy', accessorKey: 'triggeredBy', header: 'Triggered By' },
  { id: 'eventCount', accessorKey: 'eventCount', header: 'Events' },
  { id: 'actions', header: 'Actions' }
]
</script>

<template>
  <UContainer class="py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Runs
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          Scrape and summarize jobs
        </p>
      </div>
      <UButton
        icon="i-lucide-play"
        size="lg"
        :loading="isRunning"
        @click="startRun"
      >
        Run Now
      </UButton>
    </div>

    <UCard>
      <UTable
        :columns="columns"
        :data="data?.runs || []"
      >
        <template #status-cell="{ row }">
          <UBadge
            :color="getStatusColor(row.original.status)"
            variant="subtle"
            class="gap-1"
          >
            <UIcon
              :name="getStatusIcon(row.original.status)"
              :class="{ 'animate-spin': row.original.status === 'running' }"
            />
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-gray-600 dark:text-gray-400">
            {{ new Date(row.original.createdAt).toLocaleString() }}
          </span>
        </template>

        <template #duration-cell="{ row }">
          <span class="font-mono text-sm">
            {{ formatDuration(row.original.startedAt, row.original.finishedAt) }}
          </span>
        </template>

        <template #triggeredBy-cell="{ row }">
          <span class="text-gray-500">{{ row.original.triggeredBy || '-' }}</span>
        </template>

        <template #eventCount-cell="{ row }">
          <span class="text-gray-500">{{ row.original.eventCount }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-eye"
            variant="ghost"
            size="sm"
            :to="`/runs/${row.original.id}`"
          />
        </template>
      </UTable>

      <div
        v-if="!data?.runs?.length"
        class="text-center py-12 text-gray-500"
      >
        No runs yet. Click "Run Now" to start your first scrape job.
      </div>
    </UCard>
  </UContainer>
</template>
