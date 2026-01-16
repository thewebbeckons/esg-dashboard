/**
 * Database seed script
 * Creates default topics and example sources
 */

import { PrismaClient } from '@prisma/client'
import { DEFAULT_TOPICS } from '../lib/taxonomy.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Seed topics
  console.log('\n📚 Creating topics...')
  for (const topic of DEFAULT_TOPICS) {
    const existing = await prisma.topic.findUnique({ where: { slug: topic.slug } })
    if (!existing) {
      await prisma.topic.create({
        data: {
          slug: topic.slug,
          name: topic.name,
          keywords: JSON.stringify(topic.keywords),
          enabled: topic.enabled
        }
      })
      console.log(`   ✅ Created topic: ${topic.name}`)
    } else {
      console.log(`   ⏭️  Topic exists: ${topic.name}`)
    }
  }

  // Seed example sources
  console.log('\n📰 Creating example sources...')

  const sources = [
    {
      name: 'ESG Today',
      type: 'rss',
      seedUrls: ['https://www.esgtoday.com/feed/'],
      selectors: null,
      enabled: true
    },
    {
      name: 'GreenBiz',
      type: 'rss',
      seedUrls: ['https://www.greenbiz.com/rss.xml'],
      selectors: null,
      enabled: true
    },
    {
      name: 'Environmental Leader',
      type: 'rss',
      seedUrls: ['https://www.environmentalleader.com/feed/'],
      selectors: null,
      enabled: true
    },
    {
      name: 'Triple Pundit',
      type: 'rss',
      seedUrls: ['https://www.triplepundit.com/feed/'],
      selectors: null,
      enabled: true
    },
    {
      name: 'Sustainable Brands',
      type: 'rss',
      seedUrls: ['https://sustainablebrands.com/rss/news'],
      selectors: null,
      enabled: true
    }
  ]

  for (const source of sources) {
    const existing = await prisma.source.findFirst({ where: { name: source.name } })
    if (!existing) {
      await prisma.source.create({
        data: {
          name: source.name,
          type: source.type,
          seedUrls: JSON.stringify(source.seedUrls),
          selectors: source.selectors ? JSON.stringify(source.selectors) : null,
          enabled: source.enabled
        }
      })
      console.log(`   ✅ Created source: ${source.name}`)
    } else {
      console.log(`   ⏭️  Source exists: ${source.name}`)
    }
  }

  console.log('\n✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
