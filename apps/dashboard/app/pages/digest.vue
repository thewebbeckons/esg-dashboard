<script setup lang="ts">
import type { DigestResult } from '@esg/core'

// Default to last 7 days
const now = new Date()
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

const startDate = ref(weekAgo.toISOString().split('T')[0])
const endDate = ref(now.toISOString().split('T')[0])

const digest = ref<DigestResult | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref('html')
const copied = ref(false)

async function generatePreview() {
  isLoading.value = true
  error.value = null
  digest.value = null

  try {
    const startIso = new Date(startDate.value || '').toISOString()
    const endIso = new Date(endDate.value ? `${endDate.value}T23:59:59` : '').toISOString()

    digest.value = await $fetch<DigestResult>('/api/digests/preview', {
      method: 'POST',
      body: { startIso, endIso }
    })
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to generate digest'
  } finally {
    isLoading.value = false
  }
}

async function copyToClipboard(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    error.value = 'Failed to copy to clipboard'
  }
}

const tabs = [
  { label: 'HTML Preview', value: 'html', icon: 'i-lucide-code' },
  { label: 'Plain Text', value: 'text', icon: 'i-lucide-file-text' }
]
</script>

<template>
  <UContainer class="py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Email Digest
      </h1>
      <p class="mt-1 text-gray-600 dark:text-gray-400">
        Generate an email digest preview for a date range
      </p>
    </div>

    <!-- Date Range Selection -->
    <UCard class="mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <UFormField label="Start Date">
          <UInput
            v-model="startDate"
            type="date"
            class="w-48"
          />
        </UFormField>

        <UFormField label="End Date">
          <UInput
            v-model="endDate"
            type="date"
            class="w-48"
          />
        </UFormField>

        <UButton
          icon="i-lucide-sparkles"
          :loading="isLoading"
          @click="generatePreview"
        >
          Generate Preview
        </UButton>
      </div>
    </UCard>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-6"
      closable
      @close="error = null"
    />

    <!-- Digest Preview -->
    <template v-if="digest">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <UCard class="text-center">
          <div class="text-3xl font-bold text-green-600">
            {{ digest.stats.totalArticles }}
          </div>
          <div class="text-sm text-gray-500">
            Articles
          </div>
        </UCard>
        <UCard class="text-center">
          <div class="text-3xl font-bold text-blue-600">
            {{ digest.stats.topicCount }}
          </div>
          <div class="text-sm text-gray-500">
            Topics
          </div>
        </UCard>
        <UCard class="text-center">
          <div class="text-lg font-semibold text-gray-600">
            {{ digest.stats.dateRange }}
          </div>
          <div class="text-sm text-gray-500">
            Date Range
          </div>
        </UCard>
      </div>

      <!-- Tabs -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <UTabs
              v-model="activeTab"
              :items="tabs"
            />

            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied ? 'success' : 'neutral'"
              variant="ghost"
              @click="copyToClipboard(activeTab === 'html' ? digest.html : digest.text)"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </UButton>
          </div>
        </template>

        <!-- HTML Preview -->
        <div
          v-if="activeTab === 'html'"
          class="bg-white rounded-lg border overflow-auto max-h-[600px]"
        >
          <iframe
            :srcdoc="digest.html"
            class="w-full min-h-[600px] border-0"
            sandbox="allow-same-origin"
          />
        </div>

        <!-- Plain Text Preview -->
        <div
          v-else
          class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[600px]"
        >
          {{ digest.text }}
        </div>
      </UCard>
    </template>

    <!-- Empty State -->
    <UCard
      v-else-if="!isLoading"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-mail"
        class="w-16 h-16 mx-auto text-gray-300 mb-4"
      />
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No Digest Generated
      </h3>
      <p class="text-gray-500 mb-4">
        Select a date range and click "Generate Preview" to create an email digest.
      </p>
    </UCard>
  </UContainer>
</template>
