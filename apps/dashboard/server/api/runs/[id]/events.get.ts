import { usePrisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Run ID required' })
  }

  // Check if SSE is requested
  const isSSE = query.stream === 'true' || query.stream === '1'

  if (!isSSE) {
    // Return all events as JSON
    const events = await prisma.runEvent.findMany({
      where: { runId: id },
      orderBy: { ts: 'asc' }
    })

    return events.map(e => ({
      ...e,
      data: e.data ? JSON.parse(e.data) : null
    }))
  }

  // SSE mode
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let lastEventId = 0
      let isRunning = true

      const sendEvent = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      const checkForEvents = async () => {
        try {
          // Get new events since last check
          const events = await prisma.runEvent.findMany({
            where: {
              runId: id,
              id: { gt: String(lastEventId) }
            },
            orderBy: { ts: 'asc' },
            take: 100
          })

          for (const e of events) {
            sendEvent({
              id: e.id,
              runId: e.runId,
              ts: e.ts,
              level: e.level,
              type: e.type,
              message: e.message,
              data: e.data ? JSON.parse(e.data) : null
            })
          }

          if (events.length > 0) {
            const lastEvent = events[events.length - 1]
            lastEventId = Number(lastEvent?.id) || lastEventId + events.length
          }

          // Check if run is complete
          const run = await prisma.run.findUnique({
            where: { id },
            select: { status: true }
          })

          if (run && ['succeeded', 'failed', 'canceled'].includes(run.status)) {
            sendEvent({ type: 'STREAM_END', status: run.status })
            isRunning = false
            controller.close()
            return
          }

          // Continue polling
          if (isRunning) {
            setTimeout(checkForEvents, 500)
          } else {
            controller.close()
          }
        } catch (error) {
          console.error('SSE error:', error)
          sendEvent({ type: 'ERROR', message: 'Stream error' })
          controller.close()
        }
      }

      // Send initial existing events
      const existingEvents = await prisma.runEvent.findMany({
        where: { runId: id },
        orderBy: { ts: 'asc' }
      })

      for (const e of existingEvents) {
        sendEvent({
          id: e.id,
          runId: e.runId,
          ts: e.ts,
          level: e.level,
          type: e.type,
          message: e.message,
          data: e.data ? JSON.parse(e.data) : null
        })
        lastEventId = Number(e.id) || lastEventId + 1
      }

      // Start polling for new events
      setTimeout(checkForEvents, 500)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
