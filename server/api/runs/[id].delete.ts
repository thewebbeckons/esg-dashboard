import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Run ID required' })
  }

  // Can only cancel queued or running runs
  const run = await prisma.run.findUnique({ where: { id } })

  if (!run) {
    throw createError({ statusCode: 404, message: 'Run not found' })
  }

  if (!['queued', 'running'].includes(run.status)) {
    throw createError({
      statusCode: 400,
      message: 'Can only cancel queued or running runs'
    })
  }

  await prisma.run.update({
    where: { id },
    data: {
      status: 'canceled',
      finishedAt: new Date()
    }
  })

  return { success: true }
})
