<script setup lang="ts">
import type { DigestResult, DigestSendInput, DigestSendResult } from '@esg/core'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

// Date formatter
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

// Default to last 7 days
const now = today(getLocalTimeZone())
const weekAgo = now.subtract({ weeks: 1 })

const startDate = ref(weekAgo) as Ref<DateValue>
const endDate = ref(now) as Ref<DateValue>

const digest = ref<DigestResult | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref('html')
const copied = ref(false)
const sendModalOpen = ref(false)
const recipients = ref<string[]>([])
const sendError = ref<string | null>(null)
const sendSuccess = ref<string | null>(null)
const isSending = ref(false)
const lastPreviewRange = ref<{ startIso: string; endIso: string } | null>(null)

const runtimeConfig = useRuntimeConfig()
const recipientOptions = computed(() => {
  const raw = runtimeConfig.public?.digestRecipientOptions || ''
  return raw
    .split(',')
    .map(option => option.trim())
    .filter(Boolean)
})

async function generatePreview() {
  isLoading.value = true
  error.value = null
  digest.value = null
  sendSuccess.value = null
  sendError.value = null
  lastPreviewRange.value = null

  try {
    const startIso = startDate.value.toDate(getLocalTimeZone()).toISOString()
    const end = endDate.value.toDate(getLocalTimeZone())
    // Set to end of day
    end.setHours(23, 59, 59, 999)
    const endIso = end.toISOString()

    digest.value = await $fetch<DigestResult>('/api/digests/preview', {
      method: 'POST',
      body: { startIso, endIso }
    })
    lastPreviewRange.value = { startIso, endIso }
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

function toggleRecipient(option: string) {
  const index = recipients.value.indexOf(option)
  if (index === -1) {
    recipients.value.push(option)
  } else {
    recipients.value.splice(index, 1)
  }
}

function openSendModal() {
  sendError.value = null
  sendSuccess.value = null
  sendModalOpen.value = true
}

async function sendDigest() {
  sendError.value = null
  sendSuccess.value = null

  if (!lastPreviewRange.value) {
    sendError.value = 'Generate a preview before sending.'
    return
  }

  const to = recipients.value.map(email => email.trim()).filter(Boolean)
  if (!to.length) {
    sendError.value = 'Add at least one recipient.'
    return
  }

  isSending.value = true

  try {
    const payload: DigestSendInput = {
      startIso: lastPreviewRange.value.startIso,
      endIso: lastPreviewRange.value.endIso,
      to
    }

    await $fetch<DigestSendResult>('/api/digests/send', {
      method: 'POST',
      body: payload
    })

    sendSuccess.value = `Digest sent to ${to.join(', ')}`
    sendModalOpen.value = false
  } catch (err: unknown) {
    sendError.value = err instanceof Error ? err.message : 'Failed to send digest'
  } finally {
    isSending.value = false
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
          <UPopover>
            <UButton icon="i-lucide-calendar" color="neutral" variant="subtle" class="w-48 justify-start">
              {{ df.format(startDate.toDate(getLocalTimeZone())) }}
            </UButton>
            <template #content>
              <UCalendar v-model="startDate" class="p-2" />
            </template>
          </UPopover>
        </UFormField>

        <UFormField label="End Date">
          <UPopover>
            <UButton icon="i-lucide-calendar" color="neutral" variant="subtle" class="w-48 justify-start">
              {{ df.format(endDate.toDate(getLocalTimeZone())) }}
            </UButton>
            <template #content>
              <UCalendar v-model="endDate" class="p-2" />
            </template>
          </UPopover>
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
    <UAlert
      v-if="sendSuccess"
      color="success"
      icon="i-lucide-check-circle"
      :title="sendSuccess"
      class="mb-6"
      closable
      @close="sendSuccess = null"
    />

    <!-- Digest Preview -->
    <template v-if="digest">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <UCard class="text-center">
          <div class="text-3xl font-bold text-primary-600">
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
          <div class="flex flex-wrap items-center justify-between gap-3">
            <UTabs
              v-model="activeTab"
              :items="tabs"
            />

            <div class="flex items-center gap-2">
              <UButton
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                :color="copied ? 'success' : 'neutral'"
                variant="ghost"
                @click="copyToClipboard(activeTab === 'html' ? digest.html : digest.text)"
              >
                {{ copied ? 'Copied!' : 'Copy' }}
              </UButton>
              <UButton
                icon="i-lucide-send"
                color="primary"
                @click="openSendModal"
              >
                Send Email
              </UButton>
            </div>
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
          class="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[600px]"
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

    <UModal v-model:open="sendModalOpen">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded w-9 h-9 flex items-center justify-center">
            <UIcon
              name="i-lucide-send"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
            />
          </div>
          <div>
            <h3 class="text-lg font-semibold">
              Send Digest Email
            </h3>
            <p
              v-if="digest"
              class="text-sm text-gray-500"
            >
              {{ digest.stats.dateRange }}
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="sendError"
            color="error"
            icon="i-lucide-alert-circle"
            :title="sendError"
            closable
            @close="sendError = null"
          />

          <UFormField
            label="To"
            required
          >
            <UInputTags
              v-model="recipients"
              placeholder="Add recipient emails"
              :add-on-paste="true"
              :add-on-blur="true"
            />
          </UFormField>

          <div
            v-if="recipientOptions.length"
            class="space-y-2"
          >
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quick add
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="option in recipientOptions"
                :key="option"
                size="xs"
                :variant="recipients.includes(option) ? 'solid' : 'soft'"
                :color="recipients.includes(option) ? 'primary' : 'neutral'"
                @click="toggleRecipient(option)"
              >
                {{ option }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            @click="sendModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            icon="i-lucide-send"
            :loading="isSending"
            :disabled="!recipients.length"
            @click="sendDigest"
          >
            Send Email
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
