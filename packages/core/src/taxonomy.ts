/**
 * Taxonomy utilities for keyword-based topic prefiltering
 */

export interface TopicConfig {
  slug: string
  name: string
  keywords: string[]
  enabled: boolean
}

/**
 * Check if text matches any topic keywords
 * Returns array of matching topic slugs
 */
export function matchTopics(text: string, topics: TopicConfig[]): string[] {
  const lowerText = text.toLowerCase()
  const matches: string[] = []

  for (const topic of topics) {
    if (!topic.enabled) continue

    for (const keyword of topic.keywords) {
      // Match whole words only using word boundaries
      const regex = new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, 'i')
      if (regex.test(lowerText)) {
        matches.push(topic.slug)
        break // Only add each topic once
      }
    }
  }

  return matches
}

/**
 * Check if text is relevant to any enabled topic
 */
export function isRelevant(text: string, topics: TopicConfig[]): boolean {
  return matchTopics(text, topics).length > 0
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Default ESG topic taxonomy
 */
export const DEFAULT_TOPICS: TopicConfig[] = [
  {
    slug: 'climate-carbon',
    name: 'Climate & Carbon',
    keywords: [
      'climate change',
      'carbon emissions',
      'carbon footprint',
      'greenhouse gas',
      'ghg',
      'net zero',
      'net-zero',
      'carbon neutral',
      'decarbonization',
      'decarbonisation',
      'carbon capture',
      'climate risk',
      'climate disclosure',
      'scope 1',
      'scope 2',
      'scope 3',
      'paris agreement',
      'sbti',
      'science based targets'
    ],
    enabled: true
  },
  {
    slug: 'esg-regulation',
    name: 'ESG Regulation',
    keywords: [
      'esg regulation',
      'esg disclosure',
      'csrd',
      'sfdr',
      'eu taxonomy',
      'sec climate',
      'tcfd',
      'issb',
      'ifrs sustainability',
      'greenwashing',
      'esg compliance',
      'sustainability reporting',
      'double materiality',
      'esg standards'
    ],
    enabled: true
  },
  {
    slug: 'sustainable-finance',
    name: 'Sustainable Finance',
    keywords: [
      'sustainable finance',
      'green bonds',
      'sustainability-linked',
      'esg investing',
      'sustainable investing',
      'impact investing',
      'esg funds',
      'esg ratings',
      'green loans',
      'climate finance',
      'transition finance',
      'blended finance',
      'carbon credits',
      'carbon offset'
    ],
    enabled: true
  },
  {
    slug: 'social-responsibility',
    name: 'Social Responsibility',
    keywords: [
      'human rights',
      'labor rights',
      'supply chain',
      'modern slavery',
      'child labor',
      'dei',
      'diversity equity inclusion',
      'workplace safety',
      'fair trade',
      'living wage',
      'worker welfare',
      'community engagement',
      'social impact',
      'stakeholder engagement'
    ],
    enabled: true
  },
  {
    slug: 'corporate-governance',
    name: 'Corporate Governance',
    keywords: [
      'corporate governance',
      'board diversity',
      'executive compensation',
      'shareholder activism',
      'proxy voting',
      'esg governance',
      'business ethics',
      'anti-corruption',
      'whistleblower',
      'corporate accountability',
      'fiduciary duty',
      'board oversight'
    ],
    enabled: true
  },
  {
    slug: 'renewable-energy',
    name: 'Renewable Energy',
    keywords: [
      'renewable energy',
      'solar power',
      'wind power',
      'clean energy',
      'energy transition',
      'battery storage',
      'green hydrogen',
      'offshore wind',
      'solar farm',
      'renewable portfolio',
      'ppa',
      'power purchase agreement',
      'energy efficiency',
      'electrification'
    ],
    enabled: true
  }
]
