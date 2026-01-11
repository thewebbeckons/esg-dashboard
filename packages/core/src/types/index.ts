import { z } from 'zod'

// Source types
export const SourceTypeSchema = z.enum(['rss', 'html', 'browser'])
export type SourceType = z.infer<typeof SourceTypeSchema>

export const HtmlSelectorsSchema = z.object({
  listPageUrl: z.string().url(),
  linkSelector: z.string(),
  titleSelector: z.string().optional(),
  dateSelector: z.string().optional()
})
export type HtmlSelectors = z.infer<typeof HtmlSelectorsSchema>

export const CreateSourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: SourceTypeSchema,
  enabled: z.boolean().default(true),
  seedUrls: z.array(z.string().url()).min(1),
  selectors: HtmlSelectorsSchema.nullable().optional()
})
export type CreateSourceInput = z.infer<typeof CreateSourceSchema>

export const UpdateSourceSchema = CreateSourceSchema.partial()
export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>

// Run types
export const RunStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled'])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const RunTypeSchema = z.enum(['discovery', 'reanalysis'])
export type RunType = z.infer<typeof RunTypeSchema>

export const CreateRunSchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  triggeredBy: z.string().optional().default('dashboard')
})
export type CreateRunInput = z.infer<typeof CreateRunSchema>

export const CreateReanalysisRunSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'At least one item ID is required'),
  triggeredBy: z.string().optional().default('dashboard')
})
export type CreateReanalysisRunInput = z.infer<typeof CreateReanalysisRunSchema>

// Item types
export const ItemStatusSchema = z.enum(['new', 'fetched', 'extracted', 'analyzed', 'skipped', 'failed'])
export type ItemStatus = z.infer<typeof ItemStatusSchema>

// RunEvent types
export const EventLevelSchema = z.enum(['debug', 'info', 'warn', 'error'])
export type EventLevel = z.infer<typeof EventLevelSchema>

export const EventTypeSchema = z.enum([
  'DISCOVER',
  'FETCH',
  'EXTRACT',
  'PREFILTER',
  'CLASSIFY',
  'SUMMARIZE',
  'DONE',
  'ERROR'
])
export type EventType = z.infer<typeof EventTypeSchema>

// LLM Analysis output
export const AnalysisOutputSchema = z.object({
  relevant: z.boolean(),
  topics: z.array(z.string()),
  importance: z.number().int().min(0).max(100),
  summaryBullets: z.array(z.string()).min(2).max(4),
  whyItMatters: z.string()
})
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>

// Digest types
export const DigestPreviewSchema = z.object({
  startIso: z.string().datetime(),
  endIso: z.string().datetime()
})
export type DigestPreviewInput = z.infer<typeof DigestPreviewSchema>

export const DigestSendSchema = z.object({
  startIso: z.string().datetime(),
  endIso: z.string().datetime(),
  to: z.array(z.string().trim().email()).min(1),
  subject: z.string().trim().min(1).max(255).optional()
})
export type DigestSendInput = z.infer<typeof DigestSendSchema>

export interface DigestArticle {
  title: string
  url: string
  source: string
  publishedAt: string | null
  summaryBullets: string[]
  whyItMatters: string
  importance: number
}

export interface DigestSection {
  topic: string
  topicName: string
  articles: DigestArticle[]
}

export interface DigestResult {
  html: string
  text: string
  stats: {
    totalArticles: number
    topicCount: number
    dateRange: string
  }
}

export interface DigestSendResult {
  success: true
  id: string | null
  stats: DigestResult['stats']
}

// Topic types
export const CreateTopicSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  keywords: z.array(z.string().min(1)).min(1),
  enabled: z.boolean().default(true)
})
export type CreateTopicInput = z.infer<typeof CreateTopicSchema>

// Extracted article
export interface ExtractedArticle {
  title: string
  author: string | null
  content: string
  textContent: string
  length: number
  excerpt: string
  siteName: string | null
  publishedTime: string | null
  language: string | null
}

// Discovered URL
export interface DiscoveredUrl {
  url: string
  title?: string
  publishedAt?: Date
}
