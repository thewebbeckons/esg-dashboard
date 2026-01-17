import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Run ID required' })
  }

  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      _count: {
        select: { events: true }
      }
    }
  })

  if (!run) {
    throw createError({ statusCode: 404, message: 'Run not found' })
  }

  // Get event summary counts
  const eventCounts = await prisma.runEvent.groupBy({
    by: ['type'],
    where: { runId: id },
    _count: true
  })

  const eventSummary = Object.fromEntries(
    eventCounts.map(e => [e.type, e._count])
  )

  // Get specific event counts for detailed stats
  const [relevantEvents, skippedEvents, analyzedEvents] = await Promise.all([
    prisma.runEvent.count({
      where: {
        runId: id,
        type: 'SUMMARIZE',
        message: { contains: 'relevant=true' }
      }
    }),
    prisma.runEvent.count({
      where: {
        runId: id,
        type: 'EXTRACT',
        level: 'warn'
      }
    }),
    prisma.runEvent.count({
      where: {
        runId: id,
        type: 'SUMMARIZE'
      }
    })
  ])

  return {
    ...run,
    sourceIds: run.sourceIds ? JSON.parse(run.sourceIds) as string[] : null,
    itemIds: run.itemIds ? JSON.parse(run.itemIds) as string[] : null,
    eventCount: run._count.events,
    eventSummary,
    relevantCount: relevantEvents,
    skippedCount: skippedEvents,
    analyzedCount: analyzedEvents
  }
})
