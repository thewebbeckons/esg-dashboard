import { CreateRunSchema } from '@esg/core'
import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const body = await readBody(event)

  // Validate input
  const result = CreateRunSchema.safeParse(body || {})
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid run data',
      data: result.error.flatten()
    })
  }

  const { sourceIds, triggeredBy } = result.data

  // Create a queued run
  const run = await prisma.run.create({
    data: {
      status: 'queued',
      sourceIds: sourceIds ? JSON.stringify(sourceIds) : null,
      triggeredBy: triggeredBy || 'dashboard'
    }
  })

  return {
    ...run,
    sourceIds: sourceIds || null
  }
})
