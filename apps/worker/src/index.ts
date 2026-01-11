/**
 * ESG News Digest - Worker Process
 * Polls for queued runs and processes them
 */

import { PrismaClient } from '@prisma/client'
import { processRun } from './processor.js'

const prisma = new PrismaClient()

const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS) || 2000

async function main() {
  console.log('🚀 ESG Worker starting...')
  console.log(`   Poll interval: ${POLL_INTERVAL}ms`)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n👋 Shutting down worker...')
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Main polling loop
  while (true) {
    try {
      const run = await claimQueuedRun()

      if (run) {
        console.log(`\n📋 Processing run: ${run.id}`)
        await processRun(prisma, run)
      }
    } catch (error) {
      console.error('Worker error:', error)
    }

    await sleep(POLL_INTERVAL)
  }
}

/**
 * Claim a queued run atomically
 */
async function claimQueuedRun() {
  // Find and update in a transaction to prevent race conditions
  const run = await prisma.$transaction(async (tx) => {
    const queuedRun = await tx.run.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' }
    })

    if (!queuedRun) return null

    return tx.run.update({
      where: { id: queuedRun.id },
      data: {
        status: 'running',
        startedAt: new Date()
      }
    })
  })

  return run
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run
main().catch(async (error) => {
  console.error('Fatal error:', error)
  await prisma.$disconnect()
  process.exit(1)
})
