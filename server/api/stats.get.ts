import { usePrisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  const prisma = usePrisma()

  const [sources, runs, articles, topics] = await Promise.all([
    prisma.source.count(),
    prisma.run.count(),
    prisma.article.count(),
    prisma.topic.count()
  ])

  return {
    sources,
    runs,
    articles,
    topics
  }
})
