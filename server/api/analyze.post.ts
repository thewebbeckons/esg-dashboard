import { z } from 'zod'
import { createLLMClient, AnalysisOutputSchema } from '@esg/core'
import { usePrisma } from '../utils/prisma'

const AnalyzeInputSchema = z.object({
  text: z.string().min(1),
  title: z.string().min(1),
  topics: z.array(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate input
  const result = AnalyzeInputSchema.safeParse(body || {})
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid analyze request',
      data: result.error.flatten()
    })
  }

  const { text, title, topics: inputTopics } = result.data

  // Get topics from DB if not provided
  let topicSlugs: string[]
  if (inputTopics && inputTopics.length > 0) {
    topicSlugs = inputTopics
  } else {
    const prisma = usePrisma()
    const dbTopics = await prisma.topic.findMany({
      where: { enabled: true },
      select: { slug: true }
    })
    topicSlugs = dbTopics.map(t => t.slug)
  }

  // Create LLM client and analyze
  const llmClient = await createLLMClient()

  const isAvailable = await llmClient.isAvailable()
  if (!isAvailable) {
    throw createError({
      statusCode: 503,
      message: 'LLM service is not available. Check OPENAI_API_KEY configuration.'
    })
  }

  const analysis = await llmClient.classifyAndSummarize(text, title, topicSlugs)

  // Validate output matches schema
  const validatedAnalysis = AnalysisOutputSchema.parse(analysis)

  return {
    analysis: validatedAnalysis,
    modelVersion: llmClient.getModelVersion()
  }
})
