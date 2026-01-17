import type { DigestArticle, DigestResult } from '@esg/core'
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

  // Build flat list of articles with topics
  const articles: DigestArticle[] = []
  const uniqueTopics = new Set<string>()

  for (const item of items) {
    if (!item.article || !item.analysis) continue

    const articleTopicSlugs = JSON.parse(item.analysis.topics) as string[]
    const summaryBullets = JSON.parse(item.analysis.summaryBullets) as string[]

    // Build topic objects with slug and name
    const articleTopics = articleTopicSlugs.map(slug => {
      uniqueTopics.add(slug)
      return {
        slug,
        name: topicMap.get(slug) || slug
      }
    })

    articles.push({
      title: item.article.title,
      url: item.url,
      source: item.source.name,
      publishedAt: item.article.publishedAt?.toISOString() || null,
      summaryBullets,
      whyItMatters: item.analysis.whyItMatters,
      importance: item.analysis.importance,
      topics: articleTopics
    })
  }

  // Sort articles by importance (most relevant first)
  articles.sort((a, b) => b.importance - a.importance)

  // Generate HTML and plain text
  const html = generateDigestHtml(articles, startDate, endDate)
  const text = generateDigestText(articles, startDate, endDate)

  return {
    html,
    text,
    stats: {
      totalArticles: items.length,
      topicCount: uniqueTopics.size,
      dateRange: formatDateRange(startDate, endDate)
    }
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }).format(date)
}

function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} - ${formatDate(end)}`
}

function generateDigestHtml(articles: DigestArticle[], start: Date, end: Date): string {
  const dateRange = formatDateRange(start, end)

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ESG News Digest - ${dateRange}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #292524; background-color: #F2F7F4; }
    h1 { color: #365146; border-bottom: 3px solid #54816F; padding-bottom: 10px; }
    .article { background: #FFFFFF; padding: 20px; margin: 20px 0; border-radius: 12px; border: 1px solid #E1ECE6; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .article h3 { margin: 0 0 8px 0; }
    .article h3 a { color: #365146; text-decoration: none; font-weight: 600; }
    .article h3 a:hover { text-decoration: underline; color: #54816F; }
    .topics { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .topic-badge { display: inline-block; background: #E1ECE6; color: #365146; font-size: 0.75em; padding: 4px 10px; border-radius: 12px; font-weight: 600; letter-spacing: 0.025em; }
    .meta { color: #78716c; font-size: 0.85em; margin-bottom: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .bullets { margin: 12px 0; padding-left: 20px; color: #44403c; line-height: 1.6; }
    .bullets li { margin: 6px 0; }
    .why-it-matters { background: #E1ECE6; padding: 15px; border-radius: 8px; font-style: italic; color: #365146; margin-top: 15px; border-left: 4px solid #54816F; }
    .why-it-matters strong { color: #292524; font-style: normal; }
  </style>
</head>
<body>
  <h1>🌿 ESG News Digest</h1>
  <p><strong>Period:</strong> ${dateRange}</p>
`

  for (const article of articles) {
    const topicBadges = article.topics
      .map(t => `<span class="topic-badge">${escapeHtml(t.name)}</span>`)
      .join('')

    html += `
  <div class="article">
    <h3><a href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a></h3>
    <div class="topics">${topicBadges}</div>
    <div class="meta">
      <strong>${escapeHtml(article.source)}</strong>
      ${article.publishedAt ? ` • ${formatDate(new Date(article.publishedAt))}` : ''}
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

  html += `
</body>
</html>`

  return html
}

function generateDigestText(articles: DigestArticle[], start: Date, end: Date): string {
  const dateRange = formatDateRange(start, end)

  let text = `ESG NEWS DIGEST\n${'='.repeat(50)}\nPeriod: ${dateRange}\n\n`

  for (const article of articles) {
    const topicNames = article.topics.map(t => t.name).join(', ')
    text += `\n• ${article.title}\n`
    text += `  Topics: [${topicNames}]\n`
    text += `  Source: ${article.source}`
    if (article.publishedAt) {
      text += ` | ${formatDate(new Date(article.publishedAt))}`
    }
    text += `\n  Link: ${article.url}\n`
    text += `\n  Key Points:\n`
    for (const bullet of article.summaryBullets) {
      text += `    - ${bullet}\n`
    }
    text += `\n  Why it matters: ${article.whyItMatters}\n`
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
