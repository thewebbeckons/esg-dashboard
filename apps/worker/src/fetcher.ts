/**
 * Article fetching with rate limiting and politeness
 */

import pLimit from 'p-limit'
import { extractDomain } from '@esg/core'

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_FETCHES) || 4
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 30000

// Global concurrency limiter
const globalLimit = pLimit(MAX_CONCURRENT)

// Per-domain rate limiting
const domainLastFetch = new Map<string, number>()
const DOMAIN_DELAY_MS = 1000 // 1 second between requests to same domain

async function waitForDomain(domain: string): Promise<void> {
  const lastFetch = domainLastFetch.get(domain) || 0
  const elapsed = Date.now() - lastFetch
  
  if (elapsed < DOMAIN_DELAY_MS) {
    await sleep(DOMAIN_DELAY_MS - elapsed)
  }
  
  domainLastFetch.set(domain, Date.now())
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function fetchArticle(url: string): Promise<string> {
  return globalLimit(async () => {
    const domain = extractDomain(url)
    await waitForDomain(domain)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ESG-News-Digest/1.0 (+https://github.com/esg-digest)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.text()
    } catch (error) {
      clearTimeout(timeout)
      throw error
    }
  })
}
