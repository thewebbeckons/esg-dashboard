/**
 * Composable for subscribing to run events via SSE
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

export function useRunEvents(runId: string) {
  const events = ref<RunEvent[]>([])
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let eventSource: EventSource | null = null

  function connect() {
    if (eventSource) return

    eventSource = new EventSource(`/api/runs/${runId}/events?stream=true`)
    isConnected.value = true

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.type === 'STREAM_END') {
          disconnect()
          return
        }

        const eventIds = new Set(events.value.map(ev => ev.id))
        if (!eventIds.has(data.id)) {
          events.value.push(data)
        }
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    eventSource.onerror = () => {
      error.value = 'Connection lost'
      disconnect()
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    isConnected.value = false
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    events,
    isConnected,
    error,
    connect,
    disconnect
  }
}
