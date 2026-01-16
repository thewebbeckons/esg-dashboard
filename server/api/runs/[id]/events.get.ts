import { usePrisma } from '../../../utils/prisma'

/**
 * Polling-based events endpoint for serverless compatibility
 *
 * Query params:
 * - after: Cursor (last event ID seen) for pagination
 *
 * Returns events after the cursor plus current run status
 */
export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Run ID required' })
  }

  // Get cursor for pagination
  const afterId = query.after as string | undefined

  // Fetch events after the cursor
  const events = await prisma.runEvent.findMany({
    where: {
      runId: id,
      ...(afterId ? { id: { gt: afterId } } : {})
    },
    orderBy: { ts: 'asc' },
    take: 100
  })

  // Get run status
  const run = await prisma.run.findUnique({
    where: { id },
    select: { status: true }
  })

  const terminalStatuses = ['succeeded', 'failed', 'canceled']
  const isComplete = run ? terminalStatuses.includes(run.status) : false

  return {
    events: events.map(e => ({
      id: e.id,
      runId: e.runId,
      ts: e.ts,
      level: e.level,
      type: e.type,
      message: e.message,
      data: e.data ? JSON.parse(e.data) : null
    })),
    status: run?.status || 'unknown',
    isComplete
  }
})
