/**
 * LLM analysis step - classifies and summarizes articles using OpenAI
 */

import {
  createLLMClient,
  matchTopics,
  type TopicConfig,
  type AnalysisOutput,
  type ExtractedArticle
} from '@esg/core'

export interface AnalysisResult {
  analysis: AnalysisOutput
  modelVersion: string
  skippedByPrefilter: boolean
}

/**
 * Analyze article content with LLM
 * Returns analysis results including whether it was skipped by prefilter
 */
export async function analyzeArticle(
  article: ExtractedArticle,
  topics: TopicConfig[]
): Promise<AnalysisResult> {
  // First do keyword prefiltering
  const combinedText = article.title + ' ' + article.textContent
  const matchedTopics = matchTopics(combinedText, topics)

  // If no keywords match, skip LLM call
  if (matchedTopics.length === 0) {
    return {
      analysis: {
        relevant: false,
        topics: [],
        importance: 0,
        summaryBullets: [],
        whyItMatters: 'Article did not match any ESG topic keywords.'
      },
      modelVersion: 'keyword-prefilter',
      skippedByPrefilter: true
    }
  }

  // Create LLM client and run analysis
  const llmClient = await createLLMClient()
  const topicSlugs = topics.map(t => t.slug)

  try {
    const analysis = await llmClient.classifyAndSummarize(
      article.textContent,
      article.title,
      topicSlugs
    )

    return {
      analysis,
      modelVersion: llmClient.getModelVersion(),
      skippedByPrefilter: false
    }
  } catch (error) {
    // Return fallback analysis on error
    console.error('LLM analysis failed:', error)

    return {
      analysis: {
        relevant: false,
        topics: matchedTopics,
        importance: 50,
        summaryBullets: ['LLM analysis failed - matched by keywords only'],
        whyItMatters: 'Analysis failed. This article matched ESG keywords and may be relevant.'
      },
      modelVersion: 'error-fallback',
      skippedByPrefilter: false
    }
  }
}
