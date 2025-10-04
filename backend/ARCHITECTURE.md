# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      macOS App (boring.notch)                    │
│                   Swift Native HTTP/WebSocket Client              │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS/WSS
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Edge Network (300+ Locations)            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Auditor Edge Worker                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Hono Router (index.ts)                            │  │  │
│  │  │  ├─ Rate Limiter Middleware                        │  │  │
│  │  │  ├─ Error Handler (problem+json)                   │  │  │
│  │  │  └─ Input Validation (Zod)                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                         │                                 │  │
│  │        ┌────────────────┼────────────────┐               │  │
│  │        ▼                ▼                ▼               │  │
│  │   ┌─────────┐    ┌──────────┐    ┌──────────┐          │  │
│  │   │  Auth   │    │ Uploads  │    │   Runs   │          │  │
│  │   │ Routes  │    │  Routes  │    │  Routes  │          │  │
│  │   └─────────┘    └──────────┘    └──────────┘          │  │
│  │        │                │                │               │  │
│  │   ┌─────────┐    ┌──────────┐    ┌──────────┐          │  │
│  │   │ Vector  │    │    D1    │    │   LLM    │          │  │
│  │   │ Routes  │    │  Routes  │    │  Routes  │          │  │
│  │   └─────────┘    └──────────┘    └──────────┘          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌─────────────────┐     ┌─────────────┐
│   R2 Bucket  │      │  Durable Objects │     │  D1 Database│
│              │      │                  │     │             │
│  Files:      │      │  RunRoom DO:     │     │  Tables:    │
│  - PDFs      │      │  - WebSocket     │     │  - runs     │
│  - CSVs      │      │  - State mgmt    │     │  - findings │
│  - Evidence  │      │  - Broadcasting  │     │  - events   │
└──────────────┘      └─────────────────┘     └─────────────┘
        │                                              │
        ▼                                              ▼
┌──────────────┐                              ┌─────────────┐
│  Vectorize   │                              │   Queues    │
│              │                              │             │
│  Index:      │                              │  Jobs:      │
│  - Embeddings│                              │  - Ingest   │
│  - Metadata  │                              │  - Process  │
│  - Search    │                              │             │
└──────────────┘                              └─────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────┐
                                              │ AI Gateway  │
                                              │             │
                                              │  Proxy to:  │
                                              │  - Gemini   │
                                              │  - Embed    │
                                              └─────────────┘
```

## Component Details

### 1. Edge Worker (Hono Router)

**Location**: `src/index.ts`

- Entry point for all requests
- Fast routing with Hono framework
- Global error handling
- Rate limiting middleware
- Request validation

### 2. Route Handlers

#### Auth Route (`src/routes/auth.ts`)
- Validates Turnstile tokens
- Mints JWT tokens (15min expiry)
- Returns tenant ID

#### Uploads Route (`src/routes/uploads.ts`)
- Generates R2 presigned PUT URLs
- Creates run records in D1
- Initializes Durable Object state

#### Runs Route (`src/routes/runs.ts`)
- Enqueues processing jobs
- Fetches run status
- Combines D1 + DO state

#### Vector Route (`src/routes/vector.ts`)
- Upserts embeddings to Vectorize
- Semantic search queries
- Metadata filtering

#### D1 Route (`src/routes/d1.ts`)
- Whitelisted query proxy
- Parameterized statements only
- Query validation

#### LLM Route (`src/routes/llm.ts`)
- Server-only authentication
- Proxies to AI Gateway
- Embedding generation

#### WebSocket Route (`src/routes/ws.ts`)
- Upgrades to WebSocket
- Forwards to Durable Object
- Real-time streaming

### 3. Durable Objects

**Class**: `RunRoom` (`src/do/RunRoom.ts`)

**Purpose**: Maintain run state and WebSocket connections

**State**:
```typescript
{
  phase: string;        // Current processing phase
  percent: number;      // Progress 0-100
  lastMessage: string;  // Latest status message
  lastUpdated: number;  // Timestamp
}
```

**Features**:
- Persistent state across requests
- WebSocket connection management
- Broadcast to all connected clients
- Per-run isolation

### 4. Libraries

#### Error Handling (`src/lib/errors.ts`)
- Custom error classes
- RFC 7807 problem+json format
- Status code mapping

#### JWT (`src/lib/jwt.ts`)
- Sign JWTs with HS256
- Verify and decode
- Bearer token extraction

#### R2 (`src/lib/r2.ts`)
- Generate presigned URLs
- Object key generation
- Upload validation

#### Schema (`src/lib/schema.ts`)
- Zod validation schemas
- Input sanitization
- Type safety

### 5. Middleware

#### Rate Limiter (`src/middleware/ratelimit.ts`)
- Token bucket algorithm
- Per-IP limits
- Per-route configuration
- In-memory state (per colo)

## Data Flow

### Upload Flow

```
1. macOS App → POST /uploads/create
   ↓
2. Worker validates input (Zod)
   ↓
3. Generate R2 presigned URL
   ↓
4. Create run record in D1
   ↓
5. Initialize DO state
   ↓
6. Return { runId, r2PutUrl, r2Key }
   ↓
7. App uploads file directly to R2
   ↓
8. App → POST /runs/:runId/enqueue
   ↓
9. Worker enqueues job to Queue
   ↓
10. Update DO state: "queued"
```

### Processing Flow

```
1. Python consumer pulls from Queue
   ↓
2. Downloads file from R2
   ↓
3. Extracts text, generates embeddings
   ↓
4. Updates via Worker API:
   - POST /vector/upsert (embeddings)
   - POST /d1/query (findings)
   - DO update (progress)
   ↓
5. Calls LLM via Worker:
   - POST /llm/gateway
   ↓
6. Final update:
   - POST /d1/query (summary)
   - DO update (done)
```

### Real-time Flow

```
1. macOS App → GET /ws/run/:runId (upgrade)
   ↓
2. Worker forwards to Durable Object
   ↓
3. DO accepts WebSocket connection
   ↓
4. DO sends current state immediately
   ↓
5. When updates occur:
   - Python calls Worker API
   - Worker calls DO.update()
   - DO broadcasts to all WebSocket clients
   ↓
6. macOS App receives JSON messages:
   { type: "progress", data: {...} }
```

## Security Model

### Authentication Flow

```
1. User visits app
   ↓
2. App shows Turnstile challenge
   ↓
3. User completes challenge
   ↓
4. App → POST /auth/start { token }
   ↓
5. Worker validates with Cloudflare
   ↓
6. Worker mints JWT (15min expiry)
   ↓
7. App stores JWT for future requests
```

### Authorization

- **JWT Required**: Most endpoints
- **Server Auth Required**: LLM endpoints (X-Server-Auth header)
- **Run Isolation**: tenantId in JWT
- **Rate Limiting**: Per-IP, per-route

### Data Isolation

- Tenant ID in all data paths
- R2 keys: `tenants/{tenantId}/{runId}/...`
- D1 queries filter by tenant_id
- DO namespaced by runId

## Performance

### Response Times (p95)

- Health check: <5ms
- Auth: <30ms (Turnstile verification)
- Upload create: <20ms (D1 + R2 URL gen)
- Run status: <15ms (D1 + DO fetch)
- Vector upsert: <50ms
- Vector query: <80ms
- D1 query: <10ms (indexed)
- WebSocket upgrade: <100ms (DO init)

### Scalability

- **Edge locations**: 300+ globally
- **Automatic scaling**: 0 to millions of requests
- **No cold starts**: V8 isolates
- **Durable Objects**: Per-run isolation, automatic scaling
- **D1**: Automatic replication across regions

## Error Handling

### Error Response Format

```json
{
  "type": "https://auditor.edge/errors/VALIDATION_ERROR",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "title": "Invalid request",
  "detail": { /* Zod errors */ }
}
```

### Error Classes

- `ValidationError` (400): Bad input
- `AuthError` (401): Authentication failed
- `NotFoundError` (404): Resource not found
- `RateLimitError` (429): Too many requests
- `ServerError` (500): Internal error

## Monitoring

### Key Metrics

1. **Request metrics**
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Status code distribution

2. **Resource metrics**
   - D1 query time
   - R2 operations
   - Vectorize query time
   - Queue depth

3. **Durable Objects metrics**
   - Active connections
   - State size
   - Update frequency

4. **Rate limiting metrics**
   - Rejected requests
   - Top offenders

### Logging

All routes log:
- Request ID
- Tenant ID
- Endpoint
- Duration
- Status code
- Errors (with stack traces)

## Deployment

### Environments

1. **Local** (`wrangler dev`)
   - Local D1 database
   - Local Durable Objects
   - Port 8787

2. **Staging** (`--env staging`)
   - Separate D1 database
   - Production resources
   - Testing only

3. **Production** (`wrangler deploy`)
   - Production resources
   - All secrets set
   - Monitored

### CI/CD Pipeline

```
Push to branch
    ↓
Run tests
    ↓
Type check
    ↓
┌─── develop ───┐     ┌─── main ───┐
│ Deploy staging│     │Deploy prod  │
└───────────────┘     └─────────────┘
```

## Cost Model

### Per 1M Requests

- Workers: $0.00 (free tier)
- D1: $0.00 (free tier)
- R2: ~$0.15 (storage + operations)
- Durable Objects: ~$0.15
- Queues: $0.00 (free tier)
- Vectorize: ~$0.05

**Total**: ~$0.35 per 1M requests

### Scaling Costs

At 100M requests/month:
- Workers: ~$50
- D1: ~$100
- R2: ~$15
- Durable Objects: ~$15
- Queues: ~$40
- Vectorize: ~$5

**Total**: ~$225/month

## Extension Points

### Adding New Routes

1. Create handler in `src/routes/`
2. Add route in `src/index.ts`
3. Add tests in `tests/`
4. Update documentation

### Adding New Resources

1. Create in Cloudflare dashboard
2. Add binding to `wrangler.toml`
3. Add type to `src/types.ts`
4. Use in routes

### Adding New Queries

1. Add to whitelist in `src/routes/d1.ts`
2. Document in README.md
3. Add tests

## Best Practices

### Security
- Always validate input with Zod
- Use parameterized queries
- Never expose secrets
- Rate limit all endpoints

### Performance
- Keep handlers lightweight
- Use indexes for D1 queries
- Cache static data
- Minimize DO calls

### Reliability
- Handle all errors gracefully
- Use structured logging
- Monitor key metrics
- Test thoroughly

---

For implementation details, see source code in `src/`

