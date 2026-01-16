/**
 * Content extraction step - extracts readable content from HTML
 */

import { extractArticle, type ExtractedArticle } from '@esg/core'

export type { ExtractedArticle }

/**
 * Extract readable article content from HTML
 */
export function extractContent(html: string, url: string): ExtractedArticle | null {
  return extractArticle(html, url)
}
