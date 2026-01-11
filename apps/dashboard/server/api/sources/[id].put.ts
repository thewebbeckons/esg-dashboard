import { UpdateSourceSchema } from '@esg/core'
import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Source ID required' })
  }

  // Validate input
  const result = UpdateSourceSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid source data',
      data: result.error.flatten()
    })
  }

  const { name, type, enabled, seedUrls, selectors } = result.data

  const source = await prisma.source.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(enabled !== undefined && { enabled }),
      ...(seedUrls !== undefined && { seedUrls: JSON.stringify(seedUrls) }),
      ...(selectors !== undefined && { selectors: selectors ? JSON.stringify(selectors) : null })
    }
  })

  return {
    ...source,
    seedUrls: JSON.parse(source.seedUrls) as string[],
    selectors: source.selectors ? JSON.parse(source.selectors) : null
  }
})
