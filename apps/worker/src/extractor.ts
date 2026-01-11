/**
 * Article extraction and LLM analysis
 */

import type { PrismaClient, Item } from '@prisma/client'
import {
  extractArticle,
  matchTopics,
  type TopicConfig,
  type ILLMClient
} from '@esg/core'
import { emitEvent } from './processor.js'

export async function extractAndAnalyze(
  prisma: PrismaClient,
  runId: string,
  item: Item,
  html: string,
  topics: TopicConfig[],
  llmClient: ILLMClient
): Promise<void> {
  // Extract readable content
  await emitEvent(prisma, runId, 'debug', 'EXTRACT', `Extracting content from: ${item.url}`)

  const article = extractArticle(html, item.url)

  if (!article || article.textContent.length < 100) {
    await emitEvent(prisma, runId, 'warn', 'EXTRACT', `Extraction failed or content too short: ${item.url}`)
    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'skipped', errorMessage: 'Content extraction failed' }
    })
    return
  }

  // Save article
  await prisma.article.create({
    data: {
      itemId: item.id,
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

  // Keyword prefilter
  await emitEvent(prisma, runId, 'debug', 'PREFILTER', `Checking relevance for: ${article.title}`)

  const matchedTopics = matchTopics(article.title + ' ' + article.textContent, topics)

  if (matchedTopics.length === 0) {
    await emitEvent(prisma, runId, 'info', 'PREFILTER', `No topic matches, skipping LLM: ${article.title}`)

    // Save minimal analysis
    await prisma.analysis.create({
      data: {
        itemId: item.id,
        relevant: false,
        topics: JSON.stringify([]),
        importance: 0,
        summaryBullets: JSON.stringify([]),
        whyItMatters: 'Article did not match any ESG topic keywords.',
        modelVersion: 'keyword-prefilter'
      }
    })

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'analyzed' }
    })
    return
  }

  await emitEvent(prisma, runId, 'info', 'PREFILTER', `Matched topics: ${matchedTopics.join(', ')}`)

  // LLM classification and summarization
  await emitEvent(prisma, runId, 'debug', 'CLASSIFY', `Sending to LLM: ${article.title}`)

  const topicSlugs = topics.map(t => t.slug)

  try {
    const analysis = await llmClient.classifyAndSummarize(
      article.textContent,
      article.title,
      topicSlugs
    )

    await emitEvent(
      prisma,
      runId,
      'info',
      'SUMMARIZE',
      `LLM analysis complete: relevant=${analysis.relevant}, importance=${analysis.importance}`
    )

    // Save analysis
    await prisma.analysis.create({
      data: {
        itemId: item.id,
        relevant: analysis.relevant,
        topics: JSON.stringify(analysis.topics),
        importance: analysis.importance,
        summaryBullets: JSON.stringify(analysis.summaryBullets),
        whyItMatters: analysis.whyItMatters,
        modelVersion: llmClient.getModelVersion()
      }
    })

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'analyzed' }
    })
  } catch (error) {
    await emitEvent(prisma, runId, 'error', 'ERROR', `LLM analysis failed: ${error}`)

    // Save error state but mark as analyzed so we don't retry indefinitely
    await prisma.analysis.create({
      data: {
        itemId: item.id,
        relevant: false,
        topics: JSON.stringify(matchedTopics),
        importance: 50,
        summaryBullets: JSON.stringify(['LLM analysis failed - matched by keywords only']),
        whyItMatters: 'Analysis failed. This article matched ESG keywords and may be relevant.',
        modelVersion: 'error-fallback'
      }
    })

    await prisma.item.update({
      where: { id: item.id },
      data: { status: 'analyzed' }
    })
  }
}
