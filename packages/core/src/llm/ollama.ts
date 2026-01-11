import { AnalysisOutputSchema, type AnalysisOutput } from '../types/index.js'
import type { ILLMClient, LLMConfig } from './types.js'

/**
 * Ollama LLM Client for local inference
 */
export class OllamaLLMClient implements ILLMClient {
  private config: LLMConfig
  private modelVersion: string

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = {
      host: config.host || process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_MODEL || 'mistral-nemo:12b',
      timeoutMs: config.timeoutMs || Number(process.env.OLLAMA_TIMEOUT_MS) || 120000
    }
    // Use model name as version (already includes tag like :12b)
    this.modelVersion = this.config.model
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.host}/api/tags`, {
        signal: controller.signal
      })

      clearTimeout(timeout)
      return response.ok
    } catch {
      return false
    }
  }

  getModelVersion(): string {
    return this.modelVersion
  }

  async classifyAndSummarize(
    text: string,
    title: string,
    topics: string[]
  ): Promise<AnalysisOutput> {
    const prompt = this.buildPrompt(text, title, topics)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 1024
          }
        }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as { response: string }
      const parsed = JSON.parse(data.response)

      // Validate with zod
      const result = AnalysisOutputSchema.parse(parsed)
      return result
    } catch (error) {
      clearTimeout(timeout)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.config.timeoutMs}ms`)
      }

      throw error
    }
  }

  private buildPrompt(text: string, title: string, topics: string[]): string {
    // Truncate text to avoid token limits
    const maxTextLength = 8000
    const truncatedText = text.length > maxTextLength
      ? text.slice(0, maxTextLength) + '...[truncated]'
      : text

    return `You are an ESG (Environmental, Social, and Governance) news analyst. Analyze the following article and provide a structured assessment.

ARTICLE TITLE: ${title}

ARTICLE TEXT:
${truncatedText}

AVAILABLE TOPICS: ${topics.join(', ')}

Analyze this article and respond with a JSON object containing:
1. "relevant" (boolean): Is this article relevant to ESG topics?
2. "topics" (string[]): Which of the available topics apply? Use exact topic slugs.
3. "importance" (number 0-100): How important is this news for ESG professionals?
4. "summaryBullets" (string[]): 2-4 key takeaways as bullet points.
5. "whyItMatters" (string): One paragraph explaining why this matters for ESG.

Respond ONLY with valid JSON, no other text.`
  }
}
