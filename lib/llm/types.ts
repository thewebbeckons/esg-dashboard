import type { AnalysisOutput } from '../types/index.js'

/**
 * LLM Client interface for article classification and summarization
 */
export interface ILLMClient {
  /**
   * Classify and summarize an article
   * @param text - The article text content
   * @param title - The article title
   * @param topics - Available topic slugs to classify into
   * @returns Analysis output with relevance, topics, importance, summary, and why it matters
   */
  classifyAndSummarize(
    text: string,
    title: string,
    topics: string[]
  ): Promise<AnalysisOutput>

  /**
   * Check if the LLM service is available
   */
  isAvailable(): Promise<boolean>

  /**
   * Get the model version string
   */
  getModelVersion(): string
}
