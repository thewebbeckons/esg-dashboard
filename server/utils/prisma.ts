import { PrismaClient } from '@esg/db'
import { PrismaPg } from '@prisma/adapter-pg'

let prisma: PrismaClient | undefined

export function usePrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}
