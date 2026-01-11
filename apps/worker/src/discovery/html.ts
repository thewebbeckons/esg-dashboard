/**
 * HTML page link discovery using cheerio
 */

import * as cheerio from 'cheerio'
import { resolveUrl } from '@esg/core'

export async function discoverFromHtml(pageUrl: string, linkSelector: string): Promise<string[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

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

  clearTimeout(timeout)

  const urls: string[] = []

  $(linkSelector).each((_, element) => {
    let href = $(element).attr('href')
    if (href) {
      // Resolve relative URLs
      href = resolveUrl(href, pageUrl)
      if (href.startsWith('http')) {
        urls.push(href)
      }
    }
  })

  return urls
}
