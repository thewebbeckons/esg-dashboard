export * from './types.js'
export { OllamaLLMClient } from './ollama.js'
export { MockLLMClient } from './mock.js'

import { OllamaLLMClient } from './ollama.js'
import { MockLLMClient } from './mock.js'
import type { ILLMClient, LLMConfig } from './types.js'

/**
 * Create an LLM client, falling back to mock if Ollama is unavailable
 */
export async function createLLMClient(config?: Partial<LLMConfig>): Promise<ILLMClient> {
  const ollamaClient = new OllamaLLMClient(config)

  const isAvailable = await ollamaClient.isAvailable()

  if (isAvailable) {
    console.log(`[LLM] Using Ollama with model: ${ollamaClient.getModelVersion()}`)
    return ollamaClient
  }

  console.log('[LLM] Ollama not available, using MockLLMClient')
  return new MockLLMClient()
}
