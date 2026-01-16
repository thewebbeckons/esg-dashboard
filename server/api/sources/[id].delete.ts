import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Source ID required' })
  }

  await prisma.source.delete({
    where: { id }
  })

  return { success: true }
})
