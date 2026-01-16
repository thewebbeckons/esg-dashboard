import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma client
let prisma: PrismaClient | undefined

/**
 * Get the Prisma client instance (singleton)
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error']
    })
  }
  return prisma
}

/**
 * Disconnect the Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}

// Re-export types
export { PrismaClient }
