<script setup lang="ts">
import type { CreateSourceInput, SourceType, HtmlSelectors } from '@esg/core'

interface Source {
  id: string
  name: string
  type: SourceType
  enabled: boolean
  seedUrls: string[]
  selectors: HtmlSelectors | null
  createdAt: string
  updatedAt: string
  itemCount: number
}

interface Topic {
  id: string
  slug: string
  name: string
  keywords: string[]
  enabled: boolean
}

const { data: sources, refresh: refreshSources } = await useFetch<Source[]>('/api/sources')
const { data: topics, refresh: refreshTopics } = await useFetch<Topic[]>('/api/topics')

const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const isDeleteModalOpen = ref(false)
const sourceToDelete = ref<{ id: string, name: string } | null>(null)

const formState = reactive({
  name: '',
  type: 'rss' as SourceType,
  enabled: true,
  seedUrls: '',
  selectors: {
    listPageUrl: '',
    linkSelector: '',
    titleSelector: '',
    dateSelector: ''
  }
})

const typeOptions = [
  { label: 'RSS Feed', value: 'rss' },
  { label: 'HTML Page', value: 'html' }
]

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'type', accessorKey: 'type', header: 'Type' },
  { id: 'enabled', accessorKey: 'enabled', header: 'Enabled' },
  { id: 'itemCount', accessorKey: 'itemCount', header: 'Items' },
  { id: 'actions', header: 'Actions' }
]

// Topics state
const isTopicModalOpen = ref(false)
const isEditingTopic = ref(false)
const editingTopicId = ref<string | null>(null)

const topicFormState = reactive({
  slug: '',
  name: '',
  keywords: '',
  enabled: true
})

const topicColumns = [
  { id: 'name', accessorKey: 'name', header: 'Topic' },
  { id: 'keywords', accessorKey: 'keywords', header: 'Keywords' },
  { id: 'enabled', accessorKey: 'enabled', header: 'Enabled' },
  { id: 'actions', header: 'Actions' }
]

const isDeleteTopicModalOpen = ref(false)
const topicToDelete = ref<{ id: string, name: string } | null>(null)

// Auto-generate slug from name when adding new topic
watch(() => topicFormState.name, (newName) => {
  if (!isEditingTopic.value) {
    topicFormState.slug = generateSlug(newName)
  }
})

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function openAddTopicModal() {
  isEditingTopic.value = false
  editingTopicId.value = null
  topicFormState.slug = ''
  topicFormState.name = ''
  topicFormState.keywords = ''
  topicFormState.enabled = true
  isTopicModalOpen.value = true
}

function openEditTopicModal(topic: Topic) {
  isEditingTopic.value = true
  editingTopicId.value = topic.id
  topicFormState.slug = topic.slug
  topicFormState.name = topic.name
  topicFormState.keywords = topic.keywords.join('\n')
  topicFormState.enabled = topic.enabled
  isTopicModalOpen.value = true
}

async function saveTopic() {
  const keywords = topicFormState.keywords.split('\n').map(k => k.trim()).filter(Boolean)

  if (isEditingTopic.value && editingTopicId.value) {
    await $fetch(`/api/topics/${editingTopicId.value}`, {
      method: 'PUT',
      body: { name: topicFormState.name, keywords, enabled: topicFormState.enabled }
    })
  } else {
    await $fetch('/api/topics', {
      method: 'POST',
      body: {
        slug: topicFormState.slug || generateSlug(topicFormState.name),
        name: topicFormState.name,
        keywords,
        enabled: topicFormState.enabled
      }
    })
  }

  isTopicModalOpen.value = false
  await refreshTopics()
}

async function toggleTopicEnabled(topic: Topic) {
  await $fetch(`/api/topics/${topic.id}`, {
    method: 'PUT',
    body: { enabled: !topic.enabled }
  })
  await refreshTopics()
}

function confirmDeleteTopic(topic: Topic) {
  topicToDelete.value = { id: topic.id, name: topic.name }
  isDeleteTopicModalOpen.value = true
}

async function deleteTopic() {
  if (!topicToDelete.value) return

  await $fetch(`/api/topics/${topicToDelete.value.id}`, { method: 'DELETE' })
  isDeleteTopicModalOpen.value = false
  topicToDelete.value = null
  await refreshTopics()
}

function openAddModal() {
  isEditing.value = false
  editingId.value = null
  formState.name = ''
  formState.type = 'rss'
  formState.enabled = true
  formState.seedUrls = ''
  formState.selectors = { listPageUrl: '', linkSelector: '', titleSelector: '', dateSelector: '' }
  isModalOpen.value = true
}

function openEditModal(source: Source) {
  isEditing.value = true
  editingId.value = source.id
  formState.name = source.name
  formState.type = source.type
  formState.enabled = source.enabled
  formState.seedUrls = source.seedUrls.join('\n')
  formState.selectors = source.selectors
    ? {
        listPageUrl: source.selectors.listPageUrl || '',
        linkSelector: source.selectors.linkSelector || '',
        titleSelector: source.selectors.titleSelector || '',
        dateSelector: source.selectors.dateSelector || ''
      }
    : { listPageUrl: '', linkSelector: '', titleSelector: '', dateSelector: '' }
  isModalOpen.value = true
}

async function saveSource() {
  const seedUrls = formState.seedUrls.split('\n').map(u => u.trim()).filter(Boolean)

  const payload: CreateSourceInput = {
    name: formState.name,
    type: formState.type,
    enabled: formState.enabled,
    seedUrls,
    selectors: formState.type !== 'rss' && formState.selectors.listPageUrl
      ? {
          listPageUrl: formState.selectors.listPageUrl,
          linkSelector: formState.selectors.linkSelector,
          titleSelector: formState.selectors.titleSelector || '',
          dateSelector: formState.selectors.dateSelector || ''
        }
      : undefined
  }

  if (isEditing.value && editingId.value) {
    await $fetch(`/api/sources/${editingId.value}`, {
      method: 'PUT',
      body: payload
    })
  } else {
    await $fetch('/api/sources', {
      method: 'POST',
      body: payload
    })
  }

  isModalOpen.value = false
  await refreshSources()
}

function confirmDelete(source: Source) {
  sourceToDelete.value = { id: source.id, name: source.name }
  isDeleteModalOpen.value = true
}

async function deleteSource() {
  if (!sourceToDelete.value) return

  await $fetch(`/api/sources/${sourceToDelete.value.id}`, { method: 'DELETE' })
  isDeleteModalOpen.value = false
  sourceToDelete.value = null
  await refreshSources()
}

async function toggleEnabled(source: Source) {
  await $fetch(`/api/sources/${source.id}`, {
    method: 'PUT',
    body: { enabled: !source.enabled }
  })
  await refreshSources()
}

function getTypeBadgeColor(type: SourceType) {
  switch (type) {
    case 'rss': return 'success'
    case 'html': return 'info'
    default: return 'neutral'
  }
}
</script>

<template>
  <UContainer class="py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Sources
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          Manage news sources for ESG content scraping
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openAddModal"
      >
        Add Source
      </UButton>
    </div>

    <!-- Topics Section -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Topics</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Configure topics for article classification</p>
          </div>
          <UButton
            icon="i-lucide-plus"
            size="sm"
            variant="soft"
            @click="openAddTopicModal"
          >
            Add Topic
          </UButton>
        </div>
      </template>

      <UTable
        :columns="topicColumns"
        :data="topics || []"
      >
        <template #name-cell="{ row }">
          <div>
            <span class="font-medium">{{ row.original.name }}</span>
            <span class="ml-2 text-xs text-gray-400">{{ row.original.slug }}</span>
          </div>
        </template>

        <template #keywords-cell="{ row }">
          <div class="flex flex-wrap gap-1 max-w-md">
            <UBadge
              v-for="kw in row.original.keywords.slice(0, 4)"
              :key="kw"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              {{ kw }}
            </UBadge>
            <UBadge
              v-if="row.original.keywords.length > 4"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              +{{ row.original.keywords.length - 4 }} more
            </UBadge>
          </div>
        </template>

        <template #enabled-cell="{ row }">
          <USwitch
            :model-value="row.original.enabled"
            @update:model-value="toggleTopicEnabled(row.original)"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              size="sm"
              @click="openEditTopicModal(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              @click="confirmDeleteTopic(row.original)"
            />
          </div>
        </template>
      </UTable>

      <div
        v-if="!topics?.length"
        class="text-center py-8 text-gray-500"
      >
        No topics configured. Add topics to classify articles.
      </div>
    </UCard>

    <!-- Sources Section -->
    <UCard>
      <UTable
        :columns="columns"
        :data="sources || []"
      >
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name }}</span>
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :color="getTypeBadgeColor(row.original.type)"
            variant="subtle"
          >
            {{ row.original.type.toUpperCase() }}
          </UBadge>
        </template>

        <template #enabled-cell="{ row }">
          <USwitch
            :model-value="row.original.enabled"
            @update:model-value="toggleEnabled(row.original)"
          />
        </template>

        <template #itemCount-cell="{ row }">
          <span class="text-gray-500">{{ row.original.itemCount }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-2 justify-end">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              size="sm"
              @click="openEditModal(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              @click="confirmDelete(row.original)"
            />
          </div>
        </template>
      </UTable>

      <div
        v-if="!sources?.length"
        class="text-center py-12 text-gray-500"
      >
        No sources configured yet. Add your first source to get started.
      </div>
    </UCard>

    <!-- Add/Edit Modal -->
    <UModal v-model:open="isModalOpen">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded w-9 h-9 flex items-center justify-center">
            <UIcon
              :name="isEditing ? 'i-lucide-pencil' : 'i-lucide-plus'"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
            />
          </div>
          <h3 class="text-lg font-semibold">
            {{ isEditing ? 'Edit Source' : 'Add Source' }}
          </h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-6">
          <div class="space-y-4">
            <UFormField
              label="Name"
              required
            >
              <UInput
                v-model="formState.name"
                placeholder="e.g., ESG Today"
              />
            </UFormField>

            <UFormField
              label="Type"
              required
            >
              <USelect
                v-model="formState.type"
                :items="typeOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Feed/Seed URLs"
              hint="One URL per line"
              required
            >
              <UTextarea
                v-model="formState.seedUrls"
                :rows="3"
                placeholder="https://example.com/feed.xml"
              />
            </UFormField>
          </div>

          <template v-if="formState.type !== 'rss'">
            <div class="border-t pt-6">
              <div class="flex items-center gap-2 mb-4">
                <UIcon
                  name="i-lucide-code"
                  class="w-4 h-4 text-gray-400"
                />
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  HTML Selectors
                </h4>
              </div>

              <div class="space-y-4">
                <UFormField label="List Page URL">
                  <UInput
                    v-model="formState.selectors.listPageUrl"
                    placeholder="https://example.com/news"
                  />
                </UFormField>

                <UFormField
                  label="Link Selector"
                  hint="CSS selector for article links"
                >
                  <UInput
                    v-model="formState.selectors.linkSelector"
                    placeholder="article a.title"
                  />
                </UFormField>

                <UFormField
                  label="Title Selector"
                  hint="Optional"
                >
                  <UInput
                    v-model="formState.selectors.titleSelector"
                    placeholder="h2.headline"
                  />
                </UFormField>

                <UFormField
                  label="Date Selector"
                  hint="Optional"
                >
                  <UInput
                    v-model="formState.selectors.dateSelector"
                    placeholder="time[datetime]"
                  />
                </UFormField>
              </div>
            </div>
          </template>

          <div class="border-t pt-4">
            <UFormField label="Enabled">
              <USwitch v-model="formState.enabled" />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            @click="isModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton @click="saveSource">
            {{ isEditing ? 'Save Changes' : 'Add Source' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-red-100 dark:bg-red-900 rounded w-9 h-9 flex items-center justify-center">
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-red-600 dark:text-red-400"
            />
          </div>
          <h3 class="text-lg font-semibold">
            Delete Source
          </h3>
        </div>
      </template>

      <template #body>
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
        >
          <template #title>
            Are you sure you want to delete <strong>{{ sourceToDelete?.name }}</strong>?
          </template>
          <template #description>
            This action cannot be undone. All items associated with this source will remain in the database.
          </template>
        </UAlert>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            @click="isDeleteModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="deleteSource"
          >
            Delete Source
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Topic Add/Edit Modal -->
    <UModal v-model:open="isTopicModalOpen">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded w-9 h-9 flex items-center justify-center">
            <UIcon
              :name="isEditingTopic ? 'i-lucide-pencil' : 'i-lucide-tag'"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
            />
          </div>
          <h3 class="text-lg font-semibold">
            {{ isEditingTopic ? 'Edit Topic' : 'Add Topic' }}
          </h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="topicFormState.name"
              placeholder="e.g., Climate & Carbon"
            />
          </UFormField>

          <UFormField
            label="Slug"
            :hint="isEditingTopic ? 'Cannot be changed' : 'Auto-generated from name'"
          >
            <UInput
              v-model="topicFormState.slug"
              :disabled="isEditingTopic"
              placeholder="climate-carbon"
            />
          </UFormField>

          <UFormField
            label="Keywords"
            hint="One keyword or phrase per line"
            required
          >
            <UTextarea
              v-model="topicFormState.keywords"
              :rows="6"
              placeholder="climate change&#10;carbon emissions&#10;net zero"
            />
          </UFormField>

          <UFormField label="Enabled">
            <USwitch v-model="topicFormState.enabled" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            @click="isTopicModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton @click="saveTopic">
            {{ isEditingTopic ? 'Save Changes' : 'Add Topic' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Topic Confirmation Modal -->
    <UModal v-model:open="isDeleteTopicModalOpen">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-red-100 dark:bg-red-900 rounded w-9 h-9 flex items-center justify-center">
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-red-600 dark:text-red-400"
            />
          </div>
          <h3 class="text-lg font-semibold">
            Delete Topic
          </h3>
        </div>
      </template>

      <template #body>
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
        >
          <template #title>
            Are you sure you want to delete <strong>{{ topicToDelete?.name }}</strong>?
          </template>
          <template #description>
            This will remove the topic from the classification taxonomy. Existing article classifications will not be affected.
          </template>
        </UAlert>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            @click="isDeleteTopicModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="deleteTopic"
          >
            Delete Topic
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
