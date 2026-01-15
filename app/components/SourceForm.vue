<script setup lang="ts">
import type { SourceType } from '@esg/core'

interface FormState {
  name: string
  type: SourceType
  enabled: boolean
  seedUrls: string
  selectors: {
    listPageUrl: string
    linkSelector: string
    titleSelector: string
    dateSelector: string
  }
}

const props = defineProps<{
  modelValue: FormState
  isEditing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FormState]
  'submit': []
  'cancel': []
}>()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const typeOptions = [
  { label: 'RSS Feed', value: 'rss' },
  { label: 'HTML Page', value: 'html' }
]
</script>

<template>
  <div class="space-y-4">
    <UFormField
      label="Name"
      required
    >
      <UInput
        v-model="form.name"
        placeholder="e.g., ESG Today"
      />
    </UFormField>

    <UFormField
      label="Type"
      required
    >
      <USelect
        v-model="form.type"
        :items="typeOptions"
        class="w-32"
      />
    </UFormField>

    <UFormField
      label="Feed/Seed URLs"
      hint="One URL per line"
      required
    >
      <UTextarea
        v-model="form.seedUrls"
        :rows="3"
        placeholder="https://example.com/feed.xml"
      />
    </UFormField>

    <template v-if="form.type !== 'rss'">
      <div class="text-sm font-medium text-gray-500 py-2 border-t mt-4">
        HTML Selectors
      </div>

      <UFormField label="List Page URL">
        <UInput
          v-model="form.selectors.listPageUrl"
          placeholder="https://example.com/news"
        />
      </UFormField>

      <UFormField
        label="Link Selector"
        hint="CSS selector for article links"
      >
        <UInput
          v-model="form.selectors.linkSelector"
          placeholder="article a.title"
        />
      </UFormField>

      <UFormField
        label="Title Selector"
        hint="Optional"
      >
        <UInput
          v-model="form.selectors.titleSelector"
          placeholder="h2.headline"
        />
      </UFormField>

      <UFormField
        label="Date Selector"
        hint="Optional"
      >
        <UInput
          v-model="form.selectors.dateSelector"
          placeholder="time[datetime]"
        />
      </UFormField>
    </template>

    <UFormField label="Enabled">
      <USwitch v-model="form.enabled" />
    </UFormField>

    <div class="flex justify-end gap-3 pt-4">
      <UButton
        variant="ghost"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton @click="emit('submit')">
        {{ isEditing ? 'Save Changes' : 'Add Source' }}
      </UButton>
    </div>
  </div>
</template>
