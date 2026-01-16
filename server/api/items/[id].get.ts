import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Item ID required' })
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      source: { select: { id: true, name: true, type: true } },
      article: true,
      analysis: true
    }
  })

  if (!item) {
    throw createError({ statusCode: 404, message: 'Item not found' })
  }

  return {
    ...item,
    analysis: item.analysis
      ? {
          ...item.analysis,
          topics: JSON.parse(item.analysis.topics) as string[],
          summaryBullets: JSON.parse(item.analysis.summaryBullets) as string[]
        }
      : null
  }
})
