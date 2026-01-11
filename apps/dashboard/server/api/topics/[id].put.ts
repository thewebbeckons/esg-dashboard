import { usePrisma } from '../../utils/prisma'
import { z } from 'zod'

const UpdateTopicSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  enabled: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Topic ID required' })
  }

  // Validate input
  const result = UpdateTopicSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid topic data',
      data: result.error.flatten()
    })
  }

  const { name, keywords, enabled } = result.data

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(keywords !== undefined && { keywords: JSON.stringify(keywords) }),
      ...(enabled !== undefined && { enabled })
    }
  })

  return {
    ...topic,
    keywords: JSON.parse(topic.keywords) as string[]
  }
})
