# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ESG News Digest is a Nuxt 4 application for scraping, analyzing, and summarizing ESG (Environmental, Social, Governance) news. It discovers articles from RSS feeds and HTML pages, extracts content using Mozilla Readability, classifies them by ESG topics using OpenAI, and generates email digests.

## Commands

```bash
pnpm dev              # Start Nuxt dev server (localhost:3000)
pnpm build            # Build for production
pnpm lint             # ESLint
pnpm typecheck        # TypeScript checking

# Database (Prisma + PostgreSQL)
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations (dev)
pnpm db:seed          # Seed database with example data
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:reset         # Reset database (destructive)
```

## Architecture

### Path Aliases
- `@esg/core` → `lib/` - Shared utilities (types, extraction, taxonomy, LLM clients)
- `@esg/db` → `prisma/generated/prisma/client.ts` - Prisma client

### Core Library (`lib/`)
- `types/index.ts` - Zod schemas and TypeScript types for all domain objects
- `llm/` - LLM client abstraction: `ILLMClient` interface with OpenAI and Mock implementations
- `taxonomy.ts` - Keyword-based topic matching for prefiltering articles before LLM analysis
- `extraction.ts` - Mozilla Readability wrapper for extracting article content from HTML

### Server (`server/`)
- `api/` - Nitro API routes following Nuxt conventions
- `workflows/esg-pipeline.ts` - Main pipeline orchestrating discovery → fetch → extract → analyze
- `workflows/steps/` - Individual pipeline steps (discovery, fetch, extract, analyze)
- `utils/prisma.ts` - Singleton Prisma client with `usePrisma()` helper
- `utils/digest.ts` - Digest HTML/text generation

### Pipeline Flow
1. **Discovery** - Find article URLs from RSS feeds or HTML pages with CSS selectors
2. **Fetch** - Download article HTML
3. **Extract** - Parse content with Mozilla Readability
4. **Prefilter** - Check topic keywords to skip irrelevant articles before LLM
5. **Analyze** - LLM classification: relevance, topics, importance (0-100), summary bullets, "why it matters"

### Frontend (`app/`)
- Vue 3 + Nuxt UI v4 components
- `composables/useRunEvents.ts` - Polls for run events to show live pipeline progress
- Pages: dashboard, sources management, runs, articles, digest generator

### Database Models (Prisma)
- `Source` - News sources (RSS or HTML with selectors)
- `Run` - Pipeline execution records with status tracking
- `RunEvent` - Timestamped log events for live monitoring
- `Item` - Discovered article URLs with status progression
- `Article` - Extracted content
- `Analysis` - LLM results (topics, importance, summary)
- `Topic` - Configurable taxonomy with keywords

## Key Patterns

### Prisma Access
Server-side code uses `usePrisma()` from `server/utils/prisma.ts`. The client is configured with the PostgreSQL adapter.

### LLM Client
Use `createLLMClient()` from `@esg/core` - automatically falls back to MockLLMClient if OpenAI is not configured.

### JSON Fields
Several Prisma fields store JSON as strings: `Source.seedUrls`, `Source.selectors`, `Analysis.topics`, `Analysis.summaryBullets`, `Topic.keywords`. Parse with `JSON.parse()`.
