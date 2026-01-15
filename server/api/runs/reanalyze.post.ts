import { CreateReanalysisRunSchema } from '@esg/core'
import { usePrisma } from '../../utils/prisma'
import { runEsgPipeline } from '../../workflows/esg-pipeline'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const body = await readBody(event)

  // Validate input
  const result = CreateReanalysisRunSchema.safeParse(body || {})
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid reanalysis data',
      data: result.error.flatten()
    })
  }

  const { itemIds, triggeredBy } = result.data

  // Verify all items exist
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, status: true }
  })

  if (items.length !== itemIds.length) {
    const foundIds = new Set(items.map(i => i.id))
    const missingIds = itemIds.filter(id => !foundIds.has(id))
    throw createError({
      statusCode: 400,
      message: `Some item IDs not found: ${missingIds.join(', ')}`
    })
  }

  // Use transaction to reset items and create run atomically
  const run = await prisma.$transaction(async (tx) => {
    // Delete associated Analysis records
    await tx.analysis.deleteMany({
      where: { itemId: { in: itemIds } }
    })

    // Delete associated Article records
    await tx.article.deleteMany({
      where: { itemId: { in: itemIds } }
    })

    // Reset item statuses to 'new'
    await tx.item.updateMany({
      where: { id: { in: itemIds } },
      data: {
        status: 'new',
        fetchedAt: null,
        errorMessage: null
      }
    })

    // Create the reanalysis run
    return tx.run.create({
      data: {
        status: 'queued',
        type: 'reanalysis',
        itemIds: JSON.stringify(itemIds),
        triggeredBy: triggeredBy || 'dashboard'
      }
    })
  })

  // Trigger the pipeline asynchronously (don't await)
  runEsgPipeline({
    runId: run.id,
    runType: 'reanalysis',
    itemIds
  }).catch(async (error) => {
    console.error('Pipeline failed:', error)
    // Error handling is done inside runEsgPipeline
  })

  return {
    ...run,
    itemIds
  }
})
