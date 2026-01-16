import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { AnalysisOutputSchema, type AnalysisOutput } from '../types/index.js'
import type { ILLMClient } from './types.js'

/**
 * OpenAI LLM Client using Vercel AI SDK
 */
export class OpenAILLMClient implements ILLMClient {
  private model: string

  constructor(model?: string) {
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY
  }

  getModelVersion(): string {
    return this.model
  }

  async classifyAndSummarize(
    text: string,
    title: string,
    topics: string[]
  ): Promise<AnalysisOutput> {
    // Truncate text to manage token usage
    const maxTextLength = 8000
    const truncatedText = text.length > maxTextLength
      ? text.slice(0, maxTextLength) + '...[truncated]'
      : text

    const { object } = await generateObject({
      model: openai(this.model),
      schema: AnalysisOutputSchema,
      prompt: `You are an ESG (Environmental, Social, and Governance) news analyst. Analyze the following article and provide a structured assessment.

ARTICLE TITLE: ${title}

ARTICLE TEXT:
${truncatedText}

AVAILABLE TOPICS: ${topics.join(', ')}

Analyze this article and determine:
1. Is this article relevant to ESG topics?
2. Which of the available topics apply? Use exact topic slugs.
3. How important is this news for ESG professionals? (0-100)
4. Provide 2-4 key takeaways as bullet points.
5. Explain in one paragraph why this matters for ESG professionals.`
    })

    return object
  }
}
