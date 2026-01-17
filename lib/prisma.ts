import { PrismaClient } from '@esg/db'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton pattern for Prisma client
let prisma: PrismaClient | undefined

/**
 * Get the Prisma client instance (singleton)
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    prisma = new PrismaClient({
      adapter,
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

