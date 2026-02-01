# Epstein Files Browser

A web application for browsing and searching through publicly released Epstein court documents. Features keyword search, semantic (AI-powered) search, and a Q&A interface.

## Features

- **Document Browser**: View all available court documents
- **Keyword Search**: Full-text search across all documents with highlighting
- **Semantic Search**: AI-powered search that understands meaning, not just keywords
- **Name Mentions**: Find where specific individuals are mentioned
- **AI Q&A**: Ask natural language questions and get answers with citations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Prisma
- **AI**: OpenAI (embeddings + GPT-4)
- **UI**: Tailwind CSS + shadcn/ui

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- OpenAI API key

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and add your OpenAI API key:

```bash
# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your-key-here
```

### 3. Start the Database

```bash
npm run db:start
```

This starts PostgreSQL with pgvector extension in Docker.

### 4. Initialize the Database

```bash
npm run db:push
```

### 5. Add Documents

Either download documents from public sources:

```bash
npm run download
```

Or manually place PDF files in the `documents/` folder.

### 6. Ingest Documents

Process documents to extract text, create embeddings, and index mentions:

```bash
npm run ingest
```

### 7. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run download` | Download documents from public sources |
| `npm run ingest` | Process and index documents |
| `npm run setup` | Full database setup (start + migrate) |

## API Endpoints

### Search
- `GET /api/search?q=query&mode=hybrid` - Search documents
  - Modes: `keyword`, `semantic`, `hybrid`

### Documents
- `GET /api/documents` - List all documents
- `GET /api/documents/[id]` - Get document details

### Mentions
- `GET /api/mentions` - Get all mentioned names with counts
- `GET /api/mentions?name=Bill Gates` - Get mentions of specific person

### Ask (Q&A)
- `POST /api/ask` - Ask a question
  - Body: `{ "question": "Where is Bill Gates mentioned?" }`

### Stats
- `GET /api/stats` - Get database statistics

## Project Structure

```
epstein-files/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── documents/    # Document pages
│   │   ├── search/       # Search page
│   │   ├── mentions/     # Mentions page
│   │   └── ask/          # AI Q&A page
│   ├── components/       # React components
│   └── lib/              # Utilities (db, openai, search)
├── scripts/              # CLI scripts
├── prisma/               # Database schema
├── documents/            # PDF storage
└── docker-compose.yml    # Database config
```

## Cost Estimates

- **Embeddings**: ~$0.02 per 1M tokens (text-embedding-3-small)
- **Q&A queries**: ~$0.03 per query (GPT-4-turbo)
- **Initial ingestion**: ~$5-10 for 1000 documents

## Disclaimer

This tool provides access to publicly released court documents for research purposes. All documents are sourced from public records. The presence of a name in these documents does not imply wrongdoing.

## License

MIT
