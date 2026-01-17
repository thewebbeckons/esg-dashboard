import { prismaAdapter } from 'better-auth/adapters/prisma'
import { usePrisma } from './utils/prisma'

export default defineServerAuth(() => ({
  database: prismaAdapter(usePrisma(), { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ['http://localhost:3000', 'http://localhost:3001']
}))
