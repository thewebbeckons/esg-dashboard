import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const prisma = usePrisma()

  const sources = await prisma.source.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { items: true }
      }
    }
  })

  return sources.map(source => ({
    ...source,
    seedUrls: JSON.parse(source.seedUrls) as string[],
    selectors: source.selectors ? JSON.parse(source.selectors) : null,
    itemCount: source._count.items
  }))
})
