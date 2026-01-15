import type { AnalysisOutput } from '../types/index.js'
import type { ILLMClient } from './types.js'

/**
 * Mock LLM Client for development and testing without Ollama
 * Provides deterministic responses based on text analysis
 */
export class MockLLMClient implements ILLMClient {
  private modelVersion = 'mock-llm-v1'

  async isAvailable(): Promise<boolean> {
    return true
  }

  getModelVersion(): string {
    return this.modelVersion
  }

  async classifyAndSummarize(
    text: string,
    title: string,
    topics: string[]
  ): Promise<AnalysisOutput> {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

    // Simple keyword-based classification
    const lowerText = (title + ' ' + text).toLowerCase()

    const matchedTopics = topics.filter(topic => {
      const keywords = this.getTopicKeywords(topic)
      return keywords.some(kw => lowerText.includes(kw))
    })

    // Use first 2-3 matched topics or default to first available
    const selectedTopics = matchedTopics.length > 0
      ? matchedTopics.slice(0, 3)
      : topics.slice(0, 1)

    // Calculate importance based on keyword density and title relevance
    const importance = this.calculateImportance(lowerText, title.toLowerCase())

    // Generate mock summary bullets from text
    const summaryBullets = this.generateSummaryBullets(text, title)

    // Generate why it matters
    const whyItMatters = this.generateWhyItMatters(selectedTopics, title)

    return {
      relevant: matchedTopics.length > 0,
      topics: selectedTopics,
      importance,
      summaryBullets,
      whyItMatters
    }
  }

  private getTopicKeywords(topic: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'climate-carbon': ['climate', 'carbon', 'emissions', 'net zero', 'greenhouse'],
      'esg-regulation': ['regulation', 'compliance', 'disclosure', 'csrd', 'sec'],
      'sustainable-finance': ['green bond', 'sustainable', 'esg fund', 'investing'],
      'social-responsibility': ['human rights', 'labor', 'diversity', 'supply chain'],
      'corporate-governance': ['governance', 'board', 'executive', 'shareholder'],
      'renewable-energy': ['renewable', 'solar', 'wind', 'clean energy', 'battery']
    }
    return keywordMap[topic] || [topic.replace(/-/g, ' ')]
  }

  private calculateImportance(text: string, title: string): number {
    let score = 50

    // Boost for urgency words
    const urgencyWords = ['urgent', 'breaking', 'major', 'significant', 'landmark', 'historic']
    if (urgencyWords.some(w => title.includes(w) || text.includes(w))) {
      score += 20
    }

    // Boost for regulatory mentions
    if (text.includes('regulation') || text.includes('law') || text.includes('policy')) {
      score += 10
    }

    // Boost for numbers/data
    if (/\d+%|\$\d+|\d+ billion|\d+ million/.test(text)) {
      score += 10
    }

    return Math.min(100, Math.max(0, score))
  }

  private generateSummaryBullets(text: string, title: string): string[] {
    // Extract first few sentences as mock bullets
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200)

    const bullets: string[] = []

    // First bullet from title context
    bullets.push(`${title} represents a notable development in the ESG landscape.`)

    // Add 1-2 more bullets from text
    if (sentences.length > 0) {
      bullets.push(sentences[0] + '.')
    }
    if (sentences.length > 2) {
      bullets.push(sentences[2] + '.')
    }

    // Ensure we have at least 2 bullets
    if (bullets.length < 2) {
      bullets.push('This article provides relevant context for ESG stakeholders.')
    }

    return bullets.slice(0, 4)
  }

  private generateWhyItMatters(topics: string[], title: string): string {
    const topicDescriptions: Record<string, string> = {
      'climate-carbon': 'climate action and carbon reduction strategies',
      'esg-regulation': 'ESG regulatory compliance and disclosure requirements',
      'sustainable-finance': 'sustainable investment trends and green finance',
      'social-responsibility': 'social impact and stakeholder welfare',
      'corporate-governance': 'corporate accountability and governance practices',
      'renewable-energy': 'clean energy transition and renewable technology'
    }

    const topicContext = topics
      .map(t => topicDescriptions[t] || t)
      .join(' and ')

    return `This article is relevant for ESG professionals tracking ${topicContext}. "${title}" provides insights that may inform strategic decisions, risk assessment, and stakeholder communications. Organizations should monitor these developments for potential impacts on their sustainability initiatives and reporting obligations.`
  }
}
