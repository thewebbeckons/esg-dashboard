import type { DigestArticle, DigestResult, DigestSection } from '@esg/core'
import { usePrisma } from './prisma'

export async function buildDigest(startDate: Date, endDate: Date): Promise<DigestResult> {
  const prisma = usePrisma()

  // Get relevant analyzed items in date range
  const items = await prisma.item.findMany({
    where: {
      status: 'analyzed',
      discoveredAt: {
        gte: startDate,
        lte: endDate
      },
      analysis: {
        relevant: true
      }
    },
    include: {
      source: { select: { name: true } },
      article: { select: { title: true, publishedAt: true } },
      analysis: true
    },
    orderBy: { discoveredAt: 'desc' }
  })

  // Get all topics for reference
  const topics = await prisma.topic.findMany()
  const topicMap = new Map(topics.map(t => [t.slug, t.name]))

  // Group by topic
  const sectionMap = new Map<string, DigestArticle[]>()

  for (const item of items) {
    if (!item.article || !item.analysis) continue

    const articleTopics = JSON.parse(item.analysis.topics) as string[]
    const summaryBullets = JSON.parse(item.analysis.summaryBullets) as string[]

    const digestArticle: DigestArticle = {
      title: item.article.title,
      url: item.url,
      source: item.source.name,
      publishedAt: item.article.publishedAt?.toISOString() || null,
      summaryBullets,
      whyItMatters: item.analysis.whyItMatters,
      importance: item.analysis.importance
    }

    // Add to each matching topic section
    for (const topic of articleTopics) {
      if (!sectionMap.has(topic)) {
        sectionMap.set(topic, [])
      }
      sectionMap.get(topic)!.push(digestArticle)
    }
  }

  // Build sections sorted by article count
  const sections: DigestSection[] = Array.from(sectionMap.entries())
    .map(([topic, articles]) => ({
      topic,
      topicName: topicMap.get(topic) || topic,
      articles: articles.sort((a, b) => b.importance - a.importance)
    }))
    .sort((a, b) => b.articles.length - a.articles.length)

  // Generate HTML and plain text
  const html = generateDigestHtml(sections, startDate, endDate)
  const text = generateDigestText(sections, startDate, endDate)

  return {
    html,
    text,
    stats: {
      totalArticles: items.length,
      topicCount: sections.length,
      dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    }
  }
}

function generateDigestHtml(sections: DigestSection[], start: Date, end: Date): string {
  const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ESG News Digest - ${dateRange}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1a1a1a; }
    h1 { color: #00A155; border-bottom: 3px solid #00A155; padding-bottom: 10px; }
    h2 { color: #016538; margin-top: 30px; }
    .article { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #00DC82; }
    .article h3 { margin: 0 0 10px 0; }
    .article h3 a { color: #007F45; text-decoration: none; }
    .article h3 a:hover { text-decoration: underline; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    .bullets { margin: 10px 0; padding-left: 20px; }
    .bullets li { margin: 5px 0; }
    .why-it-matters { background: #e8f5e9; padding: 10px; border-radius: 4px; font-style: italic; }
  </style>
</head>
<body>
  <h1>🌿 ESG News Digest</h1>
  <p><strong>Period:</strong> ${dateRange}</p>
`

  for (const section of sections) {
    html += `\n  <h2>${section.topicName}</h2>\n`

    for (const article of section.articles) {
      html += `
  <div class="article">
    <h3><a href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a></h3>
    <div class="meta">
      <strong>${escapeHtml(article.source)}</strong>
      ${article.publishedAt ? ` • ${new Date(article.publishedAt).toLocaleDateString()}` : ''}
    </div>
    <ul class="bullets">
      ${article.summaryBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('\n      ')}
    </ul>
    <div class="why-it-matters">
      <strong>Why it matters:</strong> ${escapeHtml(article.whyItMatters)}
    </div>
  </div>
`
    }
  }

  html += `
</body>
</html>`

  return html
}

function generateDigestText(sections: DigestSection[], start: Date, end: Date): string {
  const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`

  let text = `ESG NEWS DIGEST\n${'='.repeat(50)}\nPeriod: ${dateRange}\n\n`

  for (const section of sections) {
    text += `\n${section.topicName.toUpperCase()}\n${'-'.repeat(40)}\n`

    for (const article of section.articles) {
      text += `\n• ${article.title}\n`
      text += `  Source: ${article.source}`
      if (article.publishedAt) {
        text += ` | ${new Date(article.publishedAt).toLocaleDateString()}`
      }
      text += `\n  Link: ${article.url}\n`
      text += `\n  Key Points:\n`
      for (const bullet of article.summaryBullets) {
        text += `    - ${bullet}\n`
      }
      text += `\n  Why it matters: ${article.whyItMatters}\n`
    }
  }

  return text
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
