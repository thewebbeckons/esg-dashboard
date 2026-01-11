import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const query = getQuery(event)

  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const runs = await prisma.run.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      _count: {
        select: { events: true }
      }
    }
  })

  const total = await prisma.run.count()

  return {
    runs: runs.map(run => ({
      ...run,
      sourceIds: run.sourceIds ? JSON.parse(run.sourceIds) as string[] : null,
      eventCount: run._count.events
    })),
    total,
    limit,
    offset
  }
})
