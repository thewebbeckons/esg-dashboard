import { CreateSourceSchema } from '@esg/core'
import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const body = await readBody(event)

  // Validate input
  const result = CreateSourceSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid source data',
      data: result.error.flatten()
    })
  }

  const { name, type, enabled, seedUrls, selectors } = result.data

  const source = await prisma.source.create({
    data: {
      name,
      type,
      enabled,
      seedUrls: JSON.stringify(seedUrls),
      selectors: selectors ? JSON.stringify(selectors) : null
    }
  })

  return {
    ...source,
    seedUrls,
    selectors
  }
})
