/**
 * Run processor - orchestrates the scrape/summarize pipeline
 */

import type { PrismaClient, Run, Source, Item } from '@prisma/client'
import { createLLMClient, type ILLMClient, type TopicConfig } from '@esg/core'
import { discoverUrls } from './discovery/index.js'
import { fetchArticle } from './fetcher.js'
import { extractAndAnalyze } from './extractor.js'

export async function processRun(prisma: PrismaClient, run: Run): Promise<void> {
  const startTime = Date.now()

  try {
    // Get topics for classification
    const topics = await prisma.topic.findMany({ where: { enabled: true } })
    const topicConfigs: TopicConfig[] = topics.map(t => ({
      slug: t.slug,
      name: t.name,
      keywords: JSON.parse(t.keywords) as string[],
      enabled: t.enabled
    }))

    // Create LLM client (Ollama or Mock fallback)
    const llmClient = await createLLMClient()

    // Check run type (default 'discovery' for backward compatibility)
    const runType = (run as Run & { type?: string }).type || 'discovery'

    let itemsToProcess: Item[]

    if (runType === 'reanalysis') {
      // Reanalysis: get items directly from itemIds
      const itemIds = (run as Run & { itemIds?: string }).itemIds
        ? JSON.parse((run as Run & { itemIds?: string }).itemIds!) as string[]
        : []

      if (itemIds.length === 0) {
        await emitEvent(prisma, run.id, 'warn', 'REANALYZE', 'No items specified for reanalysis')
        await completeRun(prisma, run.id, 'succeeded')
        return
      }

      itemsToProcess = await prisma.item.findMany({
        where: { id: { in: itemIds } }
      })

      await emitEvent(prisma, run.id, 'info', 'REANALYZE', `Reanalyzing ${itemsToProcess.length} items`)
    } else {
      // Discovery: existing logic
      const sourceIds = run.sourceIds ? JSON.parse(run.sourceIds) as string[] : null
      const sources = await prisma.source.findMany({
        where: {
          enabled: true,
          ...(sourceIds ? { id: { in: sourceIds } } : {})
        }
      })

      if (sources.length === 0) {
        await emitEvent(prisma, run.id, 'warn', 'DISCOVER', 'No enabled sources to process')
        await completeRun(prisma, run.id, 'succeeded')
        return
      }

      await emitEvent(prisma, run.id, 'info', 'DISCOVER', `Found ${sources.length} sources to process`)

      // Phase 1: Discovery
      const discoveredItems: Item[] = []
      for (const source of sources) {
        try {
          await emitEvent(prisma, run.id, 'info', 'DISCOVER', `Discovering URLs from: ${source.name}`)
          const urls = await discoverUrls(source)
          await emitEvent(prisma, run.id, 'info', 'DISCOVER', `Found ${urls.length} URLs from ${source.name}`)

          // Upsert items
          for (const url of urls) {
            try {
              const item = await prisma.item.upsert({
                where: { canonicalUrl: url.canonicalUrl },
                create: {
                  sourceId: source.id,
                  url: url.url,
                  canonicalUrl: url.canonicalUrl,
                  status: 'new'
                },
                update: {} // Don't update if exists
              })

              if (item.status === 'new') {
                discoveredItems.push(item)
              }
            } catch (error) {
              // Skip duplicates silently
              if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
                console.error('Item upsert error:', error)
              }
            }
          }
        } catch (error) {
          await emitEvent(prisma, run.id, 'error', 'ERROR', `Discovery failed for ${source.name}: ${error}`)
        }
      }

      await emitEvent(prisma, run.id, 'info', 'DISCOVER', `Total new items to process: ${discoveredItems.length}`)
      itemsToProcess = discoveredItems
    }

    // Phase 2: Fetch, Extract, Analyze (shared for both types)
    let processed = 0
    let failed = 0

    for (const item of itemsToProcess) {
      try {
        await processItem(prisma, run.id, item, topicConfigs, llmClient)
        processed++
      } catch (error) {
        failed++
        await emitEvent(prisma, run.id, 'error', 'ERROR', `Failed to process ${item.url}: ${error}`)
        await prisma.item.update({
          where: { id: item.id },
          data: { status: 'failed', errorMessage: String(error) }
        })
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    await emitEvent(
      prisma,
      run.id,
      'info',
      'DONE',
      `Run completed in ${duration}s. Processed: ${processed}, Failed: ${failed}`
    )

    await completeRun(prisma, run.id, 'succeeded')
  } catch (error) {
    await emitEvent(prisma, run.id, 'error', 'ERROR', `Run failed: ${error}`)
    await completeRun(prisma, run.id, 'failed')
  }
}

async function processItem(
  prisma: PrismaClient,
  runId: string,
  item: Item,
  topics: TopicConfig[],
  llmClient: ILLMClient
): Promise<void> {
  // Fetch
  await emitEvent(prisma, runId, 'debug', 'FETCH', `Fetching: ${item.url}`)
  const html = await fetchArticle(item.url)

  await prisma.item.update({
    where: { id: item.id },
    data: { status: 'fetched', fetchedAt: new Date() }
  })

  // Extract and analyze
  await extractAndAnalyze(prisma, runId, item, html, topics, llmClient)
}

async function completeRun(prisma: PrismaClient, runId: string, status: 'succeeded' | 'failed'): Promise<void> {
  await prisma.run.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date()
    }
  })
}

export async function emitEvent(
  prisma: PrismaClient,
  runId: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  type: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await prisma.runEvent.create({
    data: {
      runId,
      level,
      type,
      message,
      data: data ? JSON.stringify(data) : null
    }
  })

  // Also log to console
  const prefix = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level]
  console.log(`${prefix} [${type}] ${message}`)
}
