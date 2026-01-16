import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const prisma = usePrisma()

  const topics = await prisma.topic.findMany({
    orderBy: { name: 'asc' }
  })

  return topics.map(topic => ({
    ...topic,
    keywords: (() => {
      try {
        return JSON.parse(topic.keywords) as string[]
      } catch {
        return []
      }
    })()
  }))
})
