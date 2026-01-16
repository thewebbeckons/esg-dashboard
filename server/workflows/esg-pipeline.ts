/**
 * ESG Pipeline - orchestrates the article discovery and analysis pipeline
 *
 * This pipeline runs as an async function, compatible with Vercel serverless.
 */

import type { Item } from '@prisma/client'
import type { TopicConfig } from '@esg/core'
import { usePrisma } from '../utils/prisma'
import { discoverUrlsFromSource } from './steps/discovery'
import { fetchArticleContent } from './steps/fetch'
import { extractContent } from './steps/extract'
import { analyzeArticle } from './steps/analyze'

export interface PipelineInput {
  runId: string
  runType: 'discovery' | 'reanalysis'
  sourceIds?: string[]
  itemIds?: string[]
}

export interface PipelineResult {
  processed: number
  failed: number
  skipped: number
}

/**
 * Run the ESG pipeline asynchronously
 * This function is meant to be called without awaiting in the API route
 */
export async function runEsgPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { runId, runType, sourceIds, itemIds } = input
  const prisma = usePrisma()

  try {
    // Mark run as started
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'running', startedAt: new Date() }
    })
    await emitEvent(prisma, runId, 'info', 'DISCOVER', `Starting ${runType} run`)

    // Get topics for classification
    const dbTopics = await prisma.topic.findMany({ where: { enabled: true } })
    const topics: TopicConfig[] = dbTopics.map(t => ({
      slug: t.slug,
      name: t.name,
      keywords: JSON.parse(t.keywords) as string[],
      enabled: t.enabled
    }))

    let itemsToProcess: Item[]

    if (runType === 'reanalysis') {
      // Reanalysis: get items directly from itemIds
      const ids = itemIds || []
      if (ids.length === 0) {
        await emitEvent(prisma, runId, 'warn', 'REANALYZE', 'No items specified for reanalysis')
        itemsToProcess = []
      } else {
        itemsToProcess = await prisma.item.findMany({
          where: { id: { in: ids } }
        })
        await emitEvent(prisma, runId, 'info', 'REANALYZE', `Reanalyzing ${itemsToProcess.length} items`)
      }
    } else {
      // Discovery: find sources and discover URLs
      const sources = await prisma.source.findMany({
        where: {
          enabled: true,
          ...(sourceIds ? { id: { in: sourceIds } } : {})
        }
      })

      if (sources.length === 0) {
        await emitEvent(prisma, runId, 'warn', 'DISCOVER', 'No enabled sources to process')
        itemsToProcess = []
      } else {
        await emitEvent(prisma, runId, 'info', 'DISCOVER', `Found ${sources.length} sources to process`)

        const discoveredItems: Item[] = []

        for (const source of sources) {
          try {
            await emitEvent(prisma, runId, 'info', 'DISCOVER', `Discovering URLs from: ${source.name}`)
            const urls = await discoverUrlsFromSource(source)
            await emitEvent(prisma, runId, 'info', 'DISCOVER', `Found ${urls.length} URLs from ${source.name}`)

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
                  update: {}
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
            await emitEvent(prisma, runId, 'error', 'ERROR', `Discovery failed for ${source.name}: ${error}`)
          }
        }

        await emitEvent(prisma, runId, 'info', 'DISCOVER', `Total new items to process: ${discoveredItems.length}`)
        itemsToProcess = discoveredItems
      }
    }

    // Process each item
    let processed = 0
    let failed = 0
    let skipped = 0

    for (const item of itemsToProcess) {
      const result = await processItem(prisma, runId, item, topics)

      if (result === 'processed') {
        processed++
      } else if (result === 'failed') {
        failed++
      } else {
        skipped++
      }
    }

    // Complete the run
    await emitEvent(
      prisma,
      runId,
      'info',
      'DONE',
      `Run completed. Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}`
    )
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'succeeded', finishedAt: new Date() }
    })

    return { processed, failed, skipped }
  } catch (error) {
    // Mark run as failed
    await emitEvent(prisma, runId, 'error', 'ERROR', `Pipeline failed: ${error}`)
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'failed', finishedAt: new Date() }
    })
    throw error
  }
}

/**
 * Process a single item through fetch -> extract -> analyze
 */
async function processItem(
  prisma: ReturnType<typeof usePrisma>,
  runId: string,
  item: Item,
  topics: TopicConfig[]
): Promise<'processed' | 'failed' | 'skipped'> {
  try {
    // Fetch
    await emitEvent(prisma, runId, 'debug', 'FETCH', `Fetching: ${item.url}`)
    const html = await fetchArticleContent(item.url)

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'fetched', fetchedAt: new Date() }
    })

    // Extract
    await emitEvent(prisma, runId, 'debug', 'EXTRACT', `Extracting content from: ${item.url}`)
    const article = extractContent(html, item.url)

    if (!article || article.textContent.length < 100) {
      await emitEvent(prisma, runId, 'warn', 'EXTRACT', `Extraction failed or content too short: ${item.url}`)
      await prisma.item.update({
        where: { id: item.id },
        data: { status: 'skipped', errorMessage: 'Content extraction failed' }
      })
      return 'skipped'
    }

    // Save article
    await prisma.article.upsert({
      where: { itemId: item.id },
      create: {
        itemId: item.id,
        title: article.title,
        author: article.author,
        publishedAt: article.publishedTime ? new Date(article.publishedTime) : null,
        text: article.textContent,
        language: article.language
      },
      update: {
        title: article.title,
        author: article.author,
        publishedAt: article.publishedTime ? new Date(article.publishedTime) : null,
        text: article.textContent,
        language: article.language
      }
    })

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'extracted' }
    })

    await emitEvent(prisma, runId, 'info', 'EXTRACT', `Extracted: "${article.title}" (${article.textContent.length} chars)`)

    // Analyze
    await emitEvent(prisma, runId, 'debug', 'CLASSIFY', `Analyzing: ${article.title}`)
    const { analysis, modelVersion, skippedByPrefilter } = await analyzeArticle(article, topics)

    if (skippedByPrefilter) {
      await emitEvent(prisma, runId, 'info', 'PREFILTER', `No topic matches, skipped LLM: ${article.title}`)
    } else {
      await emitEvent(
        prisma,
        runId,
        'info',
        'SUMMARIZE',
        `LLM analysis complete: relevant=${analysis.relevant}, importance=${analysis.importance}`
      )
    }

    // Save analysis
    await prisma.analysis.upsert({
      where: { itemId: item.id },
      create: {
        itemId: item.id,
        relevant: analysis.relevant,
        topics: JSON.stringify(analysis.topics),
        importance: analysis.importance,
        summaryBullets: JSON.stringify(analysis.summaryBullets),
        whyItMatters: analysis.whyItMatters,
        modelVersion
      },
      update: {
        relevant: analysis.relevant,
        topics: JSON.stringify(analysis.topics),
        importance: analysis.importance,
        summaryBullets: JSON.stringify(analysis.summaryBullets),
        whyItMatters: analysis.whyItMatters,
        modelVersion
      }
    })

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'analyzed' }
    })

    return 'processed'
  } catch (error) {
    await emitEvent(prisma, runId, 'error', 'ERROR', `Failed to process ${item.url}: ${error}`)
    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'failed', errorMessage: String(error) }
    })
    return 'failed'
  }
}

/**
 * Emit a run event to the database for monitoring
 */
async function emitEvent(
  prisma: ReturnType<typeof usePrisma>,
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
  const prefix = { debug: '[DEBUG]', info: '[INFO]', warn: '[WARN]', error: '[ERROR]' }[level]
  console.log(`${prefix} [${type}] ${message}`)
}
