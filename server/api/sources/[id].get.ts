import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Source ID required' })
  }

  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      _count: {
        select: { items: true }
      }
    }
  })

  if (!source) {
    throw createError({ statusCode: 404, message: 'Source not found' })
  }

  return {
    ...source,
    seedUrls: JSON.parse(source.seedUrls) as string[],
    selectors: source.selectors ? JSON.parse(source.selectors) : null,
    itemCount: source._count.items
  }
})
