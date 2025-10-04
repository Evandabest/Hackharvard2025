# Auditor Edge API

Production-ready Cloudflare Workers edge API for the macOS notch app. Provides secure file uploads to R2, D1 database proxy, Vectorize integration, real-time WebSocket updates via Durable Objects, and AI Gateway proxying.

## Features

- 🔐 **Authentication**: Turnstile validation + JWT tokens
- 📦 **R2 Uploads**: Signed URLs for secure PDF/CSV uploads
- ⚡ **Queues**: Background job processing via Cloudflare Queues
- 🔴 **Real-time**: WebSocket streaming via Durable Objects
- 🧠 **Vectorize**: Embedding storage and semantic search
- 💾 **D1 Database**: Whitelisted parameterized queries
- 🤖 **AI Gateway**: Proxy to Google AI Studio (no client keys)
- 🚀 **Edge Performance**: Global CDN deployment

## Architecture

```
┌─────────────┐
│  macOS App  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│     Cloudflare Workers (Edge)       │
│  ┌───────────┐  ┌────────────────┐ │
│  │  Router   │  │  Rate Limiter  │ │
│  └─────┬─────┘  └────────────────┘ │
│        │                             │
│  ┌─────┴──────────────────────────┐│
│  │  Auth │ Uploads │ Runs │ Vector ││
│  │   D1  │   LLM   │  WS  │        ││
│  └────────────────────────────────┘│
└──────┬───────────┬──────────┬───────┘
       │           │          │
   ┌───▼──┐   ┌───▼───┐  ┌──▼────┐
   │  R2  │   │  D1   │  │ Queues│
   └──────┘   └───────┘  └───────┘
       │           │          │
   ┌───▼──────┐   │      ┌───▼────────┐
   │Vectorize │   │      │   Durable  │
   └──────────┘   │      │  Objects   │
                  │      └────────────┘
            ┌─────▼─────┐
            │AI Gateway │
            └───────────┘
```

## Prerequisites

- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers paid plan (for Durable Objects)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create auditor

# Note the database_id from output, update wrangler.toml

# Create R2 bucket
wrangler r2 bucket create auditor

# Create Queue
wrangler queues create auditor-ingest

# Create Vectorize index (1536 dimensions for OpenAI/Google embeddings)
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine
```

### 3. Update Configuration

Edit `wrangler.toml` and replace:
- `database_id` with your D1 database ID
- `AI_GATEWAY_URL` with your AI Gateway endpoint

### 4. Set Secrets

```bash
# Turnstile secret (get from Cloudflare dashboard)
wrangler secret put TURNSTILE_SECRET

# JWT secret (use the generated secret)
wrangler secret put JWT_SECRET
```

### 5. Run Migrations

```bash
# Local development
npm run migrate:local

# Production
npm run migrate:prod
```

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## API Endpoints

### Authentication

#### `POST /auth/start`
Validate Turnstile token and mint JWT.

**Request:**
```json
{
  "token": "turnstile-token-here"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "tenantId": "tenant_1234",
  "expiresIn": 900
}
```

### Uploads

#### `POST /uploads/create`
Generate signed R2 upload URL.

**Request:**
```json
{
  "contentType": "application/pdf",
  "filename": "document.pdf",
  "tenantId": "tenant_1234"
}
```

**Response:**
```json
{
  "runId": "run_1234",
  "r2PutUrl": "https://...",
  "r2Key": "tenants/tenant_1234/run_1234/document.pdf"
}
```

### Runs

#### `POST /runs/:runId/enqueue`
Queue a run for processing.

**Request:**
```json
{
  "r2Key": "tenants/tenant_1234/run_1234/document.pdf"
}
```

#### `GET /runs/:runId/status`
Get run status with real-time state.

**Response:**
```json
{
  "runId": "run_1234",
  "tenantId": "tenant_1234",
  "status": "processing",
  "createdAt": "2024-01-15T10:30:00Z",
  "realtime": {
    "phase": "analyzing",
    "percent": 45,
    "lastMessage": "Extracting text..."
  }
}
```

### WebSocket

#### `GET /ws/run/:runId`
Connect to real-time run updates.

**Messages:**
```json
{
  "type": "progress",
  "data": {
    "phase": "analyzing",
    "percent": 45,
    "lastMessage": "Extracting text..."
  },
  "timestamp": 1705315800000
}
```

### Vector Operations

#### `POST /vector/upsert`
Insert/update embeddings.

**Request:**
```json
{
  "ids": ["chunk-1", "chunk-2"],
  "vectors": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "metadatas": [{"text": "..."}, {"text": "..."}]
}
```

#### `POST /vector/query`
Semantic search.

**Request:**
```json
{
  "vector": [0.1, 0.2, ...],
  "topK": 10,
  "filter": {"category": "financial"}
}
```

**Response:**
```json
{
  "matches": [
    {
      "id": "chunk-1",
      "score": 0.95,
      "metadata": {"text": "..."}
    }
  ]
}
```

### D1 Database

#### `POST /d1/query`
Execute whitelisted query.

**Whitelisted queries:**
- `insert_run` - Create new run
- `update_status` - Update run status
- `insert_finding` - Add audit finding
- `get_run` - Get run by ID
- `get_findings` - Get findings for run
- `insert_event` - Log event

**Request:**
```json
{
  "name": "insert_finding",
  "params": ["finding-123", "run-456", "F001", "high", "Title", "Detail", "evidence.pdf"]
}
```

### AI Gateway (Server-only)

#### `POST /llm/gateway`
Proxy LLM requests through AI Gateway.

**Requires:** `X-Server-Auth` header

**Request:**
```json
{
  "model": "gemini-pro",
  "messages": [
    {"role": "user", "content": "Analyze this document..."}
  ],
  "temperature": 0.7
}
```

#### `POST /llm/embed`
Generate embeddings via AI Gateway.

**Requires:** `X-Server-Auth` header

**Request:**
```json
{
  "texts": ["text to embed", "another text"]
}
```

## Database Schema

### Runs Table
```sql
runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TEXT,
  status TEXT,
  r2_key TEXT,
  summary TEXT
)
```

### Findings Table
```sql
findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  evidence_r2_key TEXT,
  created_at TEXT
)
```

### Events Table
```sql
events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ts TEXT,
  level TEXT,
  message TEXT NOT NULL,
  data TEXT
)
```

## Development

### Project Structure

```
auditor-edge/
├── src/
│   ├── index.ts              # Main router
│   ├── types.ts              # TypeScript types
│   ├── routes/               # Route handlers
│   │   ├── auth.ts
│   │   ├── uploads.ts
│   │   ├── runs.ts
│   │   ├── vector.ts
│   │   ├── d1.ts
│   │   ├── llm.ts
│   │   └── ws.ts
│   ├── do/
│   │   └── RunRoom.ts        # Durable Object
│   ├── lib/
│   │   ├── errors.ts         # Error handling
│   │   ├── jwt.ts            # JWT utilities
│   │   ├── r2.ts             # R2 helpers
│   │   └── schema.ts         # Zod schemas
│   └── middleware/
│       └── ratelimit.ts      # Rate limiting
├── tests/
│   ├── vector.test.ts
│   ├── d1.test.ts
│   └── setup.ts
├── migrations/
│   └── 001_init.sql
├── wrangler.toml
├── package.json
└── README.md
```

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run type-check
```

### Local Development

```bash
# Start dev server with hot reload
npm run dev

# Test with local D1
wrangler d1 execute auditor --local --command="SELECT * FROM runs"
```

### Debugging

Enable detailed logging:

```bash
wrangler dev --log-level debug
```

View logs in production:

```bash
wrangler tail
```

## Deployment

### Deploy to Production

```bash
npm run deploy
```

### Environment-specific Deployment

Update `wrangler.toml` with environment configs:

```toml
[env.staging]
vars = { AI_GATEWAY_URL = "https://gateway-staging.ai..." }

[env.production]
vars = { AI_GATEWAY_URL = "https://gateway.ai..." }
```

Deploy:

```bash
wrangler deploy --env staging
wrangler deploy --env production
```

### CI/CD

GitHub Actions automatically deploys:
- `develop` branch → staging
- `main` branch → production

**Required secrets:**
- `CLOUDFLARE_API_TOKEN`: Get from Cloudflare dashboard

## Rate Limiting

Built-in token bucket rate limiter:

| Endpoint | Max Tokens | Refill Rate |
|----------|------------|-------------|
| /auth/start | 10 | 1/sec |
| /uploads/create | 20 | 2/sec |
| /runs/* | 20-60 | 2-10/sec |
| /vector/* | 30-60 | 3-6/sec |
| /d1/query | 30 | 3/sec |
| /llm/* | 10 | 1/sec |

## Security

- ✅ Turnstile bot protection
- ✅ JWT-based authentication
- ✅ Signed R2 URLs (time-limited)
- ✅ Whitelisted D1 queries only
- ✅ Server-only AI Gateway access
- ✅ Rate limiting per IP
- ✅ Input validation with Zod
- ✅ Structured error responses

## Monitoring

### Key Metrics

- Request latency (p50, p95, p99)
- Error rates by endpoint
- D1 query performance
- R2 upload success rate
- WebSocket connection count
- Queue depth

### Cloudflare Dashboard

Monitor at: https://dash.cloudflare.com → Workers & Pages → auditor-edge

## Troubleshooting

### Common Issues

**D1 database not found:**
```bash
# Verify database exists
wrangler d1 list

# Check database_id in wrangler.toml
```

**R2 upload fails:**
- Verify bucket exists: `wrangler r2 bucket list`
- Check CORS configuration on R2 bucket
- Validate presigned URL expiry

**WebSocket won't connect:**
- Ensure Durable Objects migration ran
- Check DO binding in wrangler.toml
- Verify Workers paid plan is active

**Rate limit errors:**
- Adjust limits in `src/middleware/ratelimit.ts`
- Consider using Cloudflare Rate Limiting rules

## Performance

- **Cold start:** ~50ms (with Durable Objects: ~100ms)
- **Average response:** <20ms (excluding external API calls)
- **D1 query:** <10ms (indexed queries)
- **R2 signed URL:** <5ms
- **Vectorize query:** ~50ms (depends on index size)

## Cost Estimates

Based on Cloudflare Workers pricing:

- **Workers requests:** $0.50/million (first 10M free)
- **D1 queries:** First 25M free, then $0.001/query
- **R2 storage:** $0.015/GB/month
- **Durable Objects:** $0.15/million requests
- **Queues:** First 1M free, then $0.40/million

**Estimated monthly cost for 1M requests:** ~$5-10

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue](#)
- Cloudflare Community: https://community.cloudflare.com/
- Docs: https://developers.cloudflare.com/workers/

---

Built with ❤️ using Cloudflare Workers, Hono, and TypeScript

