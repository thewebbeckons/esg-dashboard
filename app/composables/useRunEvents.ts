/**
 * Composable for subscribing to run events via polling
 */

interface RunEvent {
  id: string
  runId: string
  ts: string
  level: string
  type: string
  message: string
  data: Record<string, unknown> | null
}

interface PollResponse {
  events: RunEvent[]
  status: string
  isComplete: boolean
}

const POLL_INTERVAL_MS = 1000

export function useRunEvents(runId: string) {
  const events = ref<RunEvent[]>([])
  const status = ref<string>('queued')
  const isPolling = ref(false)
  const isComplete = ref(false)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastEventId: string | null = null

  async function poll() {
    try {
      const params = new URLSearchParams()
      if (lastEventId) {
        params.set('after', lastEventId)
      }

      const url = `/api/runs/${runId}/events${params.toString() ? `?${params}` : ''}`
      const response = await $fetch<PollResponse>(url)

      // Add new events
      if (response.events.length > 0) {
        const existingIds = new Set(events.value.map(e => e.id))
        for (const event of response.events) {
          if (!existingIds.has(event.id)) {
            events.value.push(event)
          }
        }
        const lastEvent = response.events[response.events.length - 1]
        if (lastEvent) {
          lastEventId = lastEvent.id
        }
      }

      // Update status
      status.value = response.status
      isComplete.value = response.isComplete

      // Stop polling if complete
      if (response.isComplete) {
        stop()
      }
    } catch (err) {
      console.error('Poll error:', err)
      error.value = 'Failed to fetch events'
    }
  }

  function start() {
    if (pollTimer) return

    isPolling.value = true
    error.value = null

    // Initial poll
    poll()

    // Start interval
    pollTimer = setInterval(poll, POLL_INTERVAL_MS)
  }

  function stop() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    isPolling.value = false
  }

  function reset() {
    stop()
    events.value = []
    lastEventId = null
    status.value = 'queued'
    isComplete.value = false
    error.value = null
  }

  onUnmounted(() => {
    stop()
  })

  return {
    events,
    status,
    isPolling,
    isComplete,
    error,
    start,
    stop,
    reset
  }
}
