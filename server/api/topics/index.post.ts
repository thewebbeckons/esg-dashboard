import { CreateTopicSchema } from '@esg/core'
import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const body = await readBody(event)

  // Validate input
  const result = CreateTopicSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid topic data',
      data: result.error.flatten()
    })
  }

  const { slug, name, keywords, enabled } = result.data

  const topic = await prisma.topic.create({
    data: {
      slug,
      name,
      keywords: JSON.stringify(keywords),
      enabled
    }
  })

  return {
    ...topic,
    keywords
  }
})
