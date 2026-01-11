# ESG News Digest

A local-first ESG news scraper and summarizer with a Nuxt 4 dashboard and worker process. Scrape RSS feeds and HTML pages, extract article content, classify by ESG topics, and generate email digests.

## Features

- 📰 **Multi-source support**: RSS feeds, HTML pages, and Playwright browser scraping
- 🤖 **LLM-powered analysis**: Classify and summarize articles using Ollama (or mock fallback)
- 📊 **Real-time monitoring**: Watch scrape jobs with live event streaming (SSE)
- 📧 **Email digests**: Generate HTML/text digests grouped by topic
- 🗄️ **Local-first**: SQLite database, no cloud services required
- 🎨 **Modern UI**: Nuxt 4 + Nuxt UI v4 dashboard

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **Ollama** (optional, for LLM analysis)

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
echo 'DATABASE_URL="file:./dev.db"' > .env
```

Optional environment variables:

```env
DATABASE_URL="file:./dev.db"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="mistral-nemo"
PLAYWRIGHT_ENABLED=false
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

### Browser (Playwright)

For JavaScript-rendered pages, use `browser` source type. Requires `PLAYWRIGHT_ENABLED=true` in `.env`.

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
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `mistral-nemo` | LLM model name |
| `OLLAMA_TIMEOUT_MS` | `120000` | LLM request timeout |
| `PLAYWRIGHT_ENABLED` | `false` | Enable browser scraping |
| `WORKER_POLL_INTERVAL_MS` | `2000` | Worker poll frequency |
| `MAX_CONCURRENT_FETCHES` | `4` | Parallel HTTP requests |

## Troubleshooting

### Extraction Issues

**Problem**: Articles show "Extraction failed" or have missing content.

**Solutions**:
1. Check if page requires JavaScript → use `browser` source type
2. Verify URL is accessible (not paywalled)
3. Check if site blocks bots (User-Agent issues)

### LLM Not Working

**Problem**: All articles show "mock-llm" as model version.

**Solutions**:
1. Ensure Ollama is running: `ollama serve`
2. Verify model is pulled: `ollama list`
3. Check `OLLAMA_HOST` in `.env`
4. Test connectivity: `curl http://localhost:11434/api/tags`

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
