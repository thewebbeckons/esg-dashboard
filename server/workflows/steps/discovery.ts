/**
 * URL discovery step - discovers article URLs from RSS feeds and HTML pages
 */

import type { Source } from '@esg/db'
import { canonicalizeUrl, resolveUrl } from '@esg/core'
import Parser from 'rss-parser'
import * as cheerio from 'cheerio'

export interface DiscoveredUrl {
  url: string
  canonicalUrl: string
  title?: string
}

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'ESG-News-Digest/1.0'
  }
})

/**
 * Discover URLs from a source (RSS or HTML)
 */
export async function discoverUrlsFromSource(source: Source): Promise<DiscoveredUrl[]> {
  const seedUrls = JSON.parse(source.seedUrls) as string[]
  const selectors = source.selectors ? JSON.parse(source.selectors) : null

  const discovered: DiscoveredUrl[] = []

  for (const seedUrl of seedUrls) {
    try {
      let urls: string[] = []

      switch (source.type) {
        case 'rss':
          urls = await discoverFromRss(seedUrl)
          break

        case 'html':
          if (selectors?.linkSelector) {
            urls = await discoverFromHtml(selectors.listPageUrl || seedUrl, selectors.linkSelector)
          }
          break

        default:
          console.warn(`Unknown source type: ${source.type}`)
      }

      // Canonicalize and dedupe
      for (const url of urls) {
        const canonicalUrl = canonicalizeUrl(url)
        if (!discovered.find(d => d.canonicalUrl === canonicalUrl)) {
          discovered.push({ url, canonicalUrl })
        }
      }
    } catch (error) {
      console.error(`Discovery error for ${seedUrl}:`, error)
    }
  }

  return discovered
}

/**
 * Discover URLs from an RSS feed
 */
async function discoverFromRss(feedUrl: string): Promise<string[]> {
  const feed = await parser.parseURL(feedUrl)
  return feed.items
    .map(item => item.link)
    .filter((link): link is string => !!link)
}

/**
 * Discover URLs from an HTML page using CSS selectors
 */
async function discoverFromHtml(pageUrl: string, linkSelector: string): Promise<string[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'ESG-News-Digest/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Failed to fetch ${pageUrl}: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const urls: string[] = []

    $(linkSelector).each((_, element) => {
      let href = $(element).attr('href')
      if (href) {
        href = resolveUrl(href, pageUrl)
        if (href.startsWith('http')) {
          urls.push(href)
        }
      }
    })

    return urls
  } finally {
    clearTimeout(timeout)
  }
}
