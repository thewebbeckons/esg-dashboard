/**
 * URL discovery from sources
 */

import type { Source } from '@prisma/client'
import { canonicalizeUrl } from '@esg/core'
import { discoverFromRss } from './rss.js'
import { discoverFromHtml } from './html.js'

export interface DiscoveredUrl {
  url: string
  canonicalUrl: string
  title?: string
}

export async function discoverUrls(source: Source): Promise<DiscoveredUrl[]> {
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
        case 'browser':
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
