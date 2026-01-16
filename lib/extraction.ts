/**
 * Article extraction using Mozilla Readability
 */

import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import type { ExtractedArticle } from './types/index.js'

/**
 * Extract readable content from HTML using Readability
 */
export function extractArticle(html: string, url: string): ExtractedArticle | null {
  try {
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // Try to get published time from meta tags before Readability modifies the DOM
    const publishedTime = getPublishedTime(document)

    const reader = new Readability(document, {
      charThreshold: 100
    })

    const article = reader.parse()

    if (!article || !article.textContent || article.textContent.length < 100) {
      return null
    }

    return {
      title: article.title || '',
      author: article.byline || null,
      content: article.content || '',
      textContent: article.textContent,
      length: article.length || 0,
      excerpt: article.excerpt || '',
      siteName: article.siteName || null,
      publishedTime,
      language: article.lang || null
    }
  } catch (error) {
    console.error('Extraction error:', error)
    return null
  }
}

/**
 * Extract published time from meta tags
 */
function getPublishedTime(document: Document): string | null {
  // Common meta tag names for publish date
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
    'time[datetime]',
    'time[itemprop="datePublished"]'
  ]

  for (const selector of metaSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      const value = element.getAttribute('content') || element.getAttribute('datetime')
      if (value) {
        return value
      }
    }
  }

  return null
}

/**
 * Clean text by removing excess whitespace
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

/**
 * Truncate text to a maximum length, preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}
