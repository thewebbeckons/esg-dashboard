# ESG News Digest

A local-first ESG news scraper and summarizer with a Nuxt 4 dashboard and worker process. Scrape RSS feeds and HTML pages, extract article content, classify by ESG topics, and generate email digests.

## Features

- 📰 **Multi-source support**: RSS feeds and HTML pages
- 🤖 **LLM-powered analysis**: Classify and summarize articles using OpenAI (or Ollama/mock fallback)
- 📊 **Real-time monitoring**: Watch scrape jobs with live event streaming (SSE)
- 📧 **Email digests**: Generate HTML/text digests grouped by topic
- 🗄️ **Postgres-backed**: Prisma Postgres (or any Postgres) database
- 🎨 **Modern UI**: Nuxt 4 + Nuxt UI v4 dashboard

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **Postgres** (Prisma Postgres or local Postgres)
- **OpenAI API key** (for LLM analysis, or Ollama as optional fallback)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

> This monorepo uses `shamefully-hoist=true` and `node-linker=hoisted` in `.npmrc` for proper Nuxt module resolution.

### 2. Set Up Database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Create database and run migrations
pnpm db:seed      # Seed with example sources and topics
```

### 3. Configure Environment

Create `.env` file with minimal configuration:

```bash
echo 'DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"' > .env
```

Optional environment variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"
LLM_PROVIDER="openai"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="mistral-nemo"
```

### 4. Start the Dashboard

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Start the Worker

In a separate terminal:

```bash
pnpm worker
```

The worker polls for queued jobs and processes them automatically.

## Usage

### Running a Scrape Job

1. Go to **Sources** page to see configured sources
2. Go to **Runs** page and click **Run Now**
3. Watch the run progress in real-time on the run detail page
4. View extracted articles on the **Articles** page

### Generating an Email Digest

1. Go to the **Digest** page
2. Select a date range
3. Click **Generate Preview**
4. Copy the HTML or plain text output

## Adding Sources

### RSS Feed

1. Go to **Sources** page → **Add Source**
2. Enter name (e.g., "GreenBiz")
3. Select type: **RSS Feed**
4. Add feed URL(s), one per line

### HTML Page

1. Go to **Sources** page → **Add Source**
2. Enter name and select **HTML Page**
3. Add the list page URL
4. Fill in selectors:
   - **Link Selector**: CSS selector for article links (e.g., `article a.headline`)
   - **Title Selector**: Optional, for extracting titles from list page
   - **Date Selector**: Optional, for extracting dates

## Project Structure

```
/
├── apps/
│   ├── dashboard/         # Nuxt 4 web app
│   │   ├── app/           # Vue components and pages
│   │   └── server/        # Nitro API routes
│   └── worker/            # Node.js worker process
│       └── src/
│           ├── index.ts       # Main loop
│           ├── processor.ts   # Run orchestration
│           ├── discovery/     # URL discovery
│           ├── fetcher.ts     # Rate-limited HTTP
│           └── extractor.ts   # Content extraction
├── packages/
│   └── core/              # Shared code
│       └── src/
│           ├── types/         # Zod schemas
│           ├── url.ts         # URL canonicalization
│           ├── extraction.ts  # Readability wrapper
│           ├── taxonomy.ts    # Topic matching
│           └── llm/           # LLM clients
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Seed data
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Nuxt dashboard |
| `pnpm worker` | Start worker process |
| `pnpm worker:dev` | Start worker in dev mode |
| `pnpm build` | Build all apps |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations (dev) |
| `pnpm db:seed` | Seed database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Reset database |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Typecheck all packages |

## Ollama Setup (Optional)

For LLM-powered classification and summarization:

### Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull the Model

```bash
ollama pull mistral-nemo
```

### Verify It's Running

```bash
curl http://localhost:11434/api/tags
```

If Ollama is not available, the worker uses a mock LLM client that provides basic keyword-based analysis.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | Postgres database connection |
| `OPENAI_API_KEY` | `""` | OpenAI API key for Vercel AI SDK |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |
| `LLM_PROVIDER` | `openai` | `openai` \| `ollama` \| `mock` |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `mistral-nemo` | LLM model name |
| `OLLAMA_TIMEOUT_MS` | `120000` | LLM request timeout |
| `WORKER_POLL_INTERVAL_MS` | `2000` | Worker poll frequency |
| `MAX_CONCURRENT_FETCHES` | `4` | Parallel HTTP requests |

## Troubleshooting

### Extraction Issues

**Problem**: Articles show "Extraction failed" or have missing content.

**Solutions**:
1. Check if page requires JavaScript → use an RSS feed or HTML list page
2. Verify URL is accessible (not paywalled)
3. Check if site blocks bots (User-Agent issues)

### LLM Not Working

**Problem**: All articles show "mock-llm" as model version.

**Solutions**:
1. Ensure `OPENAI_API_KEY` is set in `.env`
2. If using Ollama, ensure it's running: `ollama serve`
3. Verify model is pulled: `ollama list`
4. Check `OLLAMA_HOST` in `.env`
5. Test connectivity: `curl http://localhost:11434/api/tags`

### Database Issues

**Problem**: "Cannot find database" or migration errors.

**Solution**:
```bash
pnpm db:reset
```

Or manually:
```bash
rm dev.db
pnpm db:push
pnpm db:seed
```

### Worker Not Processing

**Problem**: Runs stay in "queued" status.

**Solutions**:
1. Ensure worker is running: `pnpm worker`
2. Check worker terminal for errors
3. Verify database path is correct in both apps

## Configuration

### Topic Taxonomy

Topics are stored in the database. Edit via Prisma Studio:

```bash
pnpm db:studio
```

Each topic has:
- `slug`: URL-safe identifier
- `name`: Display name
- `keywords`: JSON array of matching keywords
- `enabled`: Whether to use in classification

## Rate Limiting

The worker has built-in politeness:
- Max 4 concurrent fetches globally
- 1 second delay between requests to same domain

Adjust in `.env`:
```env
MAX_CONCURRENT_FETCHES=2
```

## License

MIT
