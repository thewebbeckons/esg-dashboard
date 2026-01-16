import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const query = getQuery(event)

  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  // Build filters
  const where: Record<string, unknown> = {}

  if (query.sourceId) {
    where.sourceId = query.sourceId
  }

  if (query.status) {
    where.status = query.status
  }

  // Filter by relevance
  if (query.relevant === 'true') {
    where.analysis = { relevant: true }
  } else if (query.relevant === 'false') {
    where.analysis = { relevant: false }
  }

  // Filter by topic
  if (query.topic) {
    where.analysis = {
      ...where.analysis as object,
      topics: { contains: query.topic as string }
    }
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: { discoveredAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      source: { select: { id: true, name: true, type: true } },
      article: { select: { id: true, title: true, publishedAt: true } },
      analysis: { select: { id: true, relevant: true, topics: true, importance: true } }
    }
  })

  const total = await prisma.item.count({ where })

  return {
    items: items.map(item => ({
      ...item,
      analysis: item.analysis
        ? {
            ...item.analysis,
            topics: (() => {
              try {
                return JSON.parse(item.analysis.topics) as string[]
              } catch {
                return []
              }
            })()
          }
        : null
    })),
    total,
    limit,
    offset
  }
})
