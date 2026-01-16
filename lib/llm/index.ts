export * from './types.js'
export { OpenAILLMClient } from './openai.js'
export { MockLLMClient } from './mock.js'

import { OpenAILLMClient } from './openai.js'
import { MockLLMClient } from './mock.js'
import type { ILLMClient } from './types.js'

/**
 * Create an LLM client, falling back to mock if OpenAI is not configured
 */
export async function createLLMClient(model?: string): Promise<ILLMClient> {
  const openaiClient = new OpenAILLMClient(model)

  const isAvailable = await openaiClient.isAvailable()

  if (isAvailable) {
    console.log(`[LLM] Using OpenAI with model: ${openaiClient.getModelVersion()}`)
    return openaiClient
  }

  console.log('[LLM] OpenAI not configured, using MockLLMClient')
  return new MockLLMClient()
}
