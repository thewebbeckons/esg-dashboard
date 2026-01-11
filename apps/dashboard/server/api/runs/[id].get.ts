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

  return {
    ...run,
    sourceIds: run.sourceIds ? JSON.parse(run.sourceIds) as string[] : null,
    itemIds: run.itemIds ? JSON.parse(run.itemIds) as string[] : null,
    eventCount: run._count.events,
    eventSummary
  }
})
