/**
 * RSS/Atom feed discovery
 */

import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'ESG-News-Digest/1.0'
  }
})

export async function discoverFromRss(feedUrl: string): Promise<string[]> {
  const feed = await parser.parseURL(feedUrl)

  const urls: string[] = []

  for (const item of feed.items) {
    if (item.link) {
      urls.push(item.link)
    }
  }

  return urls
}
