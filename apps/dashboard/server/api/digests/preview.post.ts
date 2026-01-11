import { DigestPreviewSchema, type DigestResult } from '@esg/core'
import { buildDigest } from '../../utils/digest'

export default defineEventHandler(async (event): Promise<DigestResult> => {
  const body = await readBody(event)

  // Validate input
  const result = DigestPreviewSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date range',
      data: result.error.flatten()
    })
  }

  const { startIso, endIso } = result.data
  const startDate = new Date(startIso)
  const endDate = new Date(endIso)

  return await buildDigest(startDate, endDate)
})
