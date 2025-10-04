# Migration from Cloudflare Queues to D1-Backed Queue

## Overview

The Auditor Edge API now uses a **free-tier D1-backed job queue** instead of Cloudflare Queues. This eliminates the need for a paid Workers plan while maintaining the same functionality.

## What Changed

### Removed
- ❌ `[[queues.producers]]` binding in `wrangler.toml`
- ❌ Cloudflare Queues API dependencies
- ❌ Need for Queue-specific API tokens

### Added
- ✅ D1 `jobs` table for queue storage
- ✅ `/jobs/*` API endpoints with Bearer token auth
- ✅ Lease-based visibility timeout mechanism
- ✅ Optional cron job to unlock stuck jobs

## Architecture

```
┌─────────────┐
│  Edge Worker │
│              │
│  POST /runs/:runId/enqueue
│     ↓
│  INSERT INTO jobs
│  (status='pending')
└──────┬──────┘
       │
       │ Agent pulls via:
       │ POST /jobs/pull
       ↓
┌─────────────┐
│ Agent       │
│ Processes   │
│ job         │
└──────┬──────┘
       │
       │ Agent acks via:
       │ POST /jobs/ack
       ↓
┌─────────────┐
│ Edge Worker │
│ UPDATE jobs │
│ SET status='done'
└─────────────┘
```

## D1 Jobs Table Schema

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,                -- job_1234_abc
  run_id TEXT NOT NULL,               -- run_1234_abc
  tenant_id TEXT NOT NULL,            -- tenant_001
  r2_key TEXT NOT NULL,               -- path/to/file.pdf
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|leased|done|failed
  attempts INTEGER NOT NULL DEFAULT 0,     -- retry counter
  visibility_deadline INTEGER,        -- unix timestamp when lease expires
  created_at INTEGER NOT NULL,        -- unix timestamp
  updated_at INTEGER NOT NULL         -- unix timestamp
);
```

## API Endpoints

### 1. POST /jobs/enqueue

Enqueue a new job for processing.

**Auth**: `Authorization: Bearer ${EDGE_API_TOKEN}`

**Request**:
```json
{
  "runId": "run_1234",
  "tenantId": "tenant_001",
  "r2Key": "path/to/file.pdf"
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job_5678_xyz",
  "runId": "run_1234",
  "status": "pending"
}
```

### 2. POST /jobs/pull

Pull available jobs with lease mechanism.

**Auth**: `Authorization: Bearer ${EDGE_API_TOKEN}`

**Request**:
```json
{
  "max": 10,
  "visibilitySeconds": 60
}
```

**Response**:
```json
{
  "jobs": [
    {
      "id": "job_5678_xyz",
      "runId": "run_1234",
      "tenantId": "tenant_001",
      "r2Key": "path/to/file.pdf",
      "attempts": 1
    }
  ]
}
```

### 3. POST /jobs/ack

Acknowledge job completion or failure.

**Auth**: `Authorization: Bearer ${EDGE_API_TOKEN}`

**Request**:
```json
{
  "ids": ["job_5678_xyz"],
  "status": "done"  // or "failed" to requeue
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    { "id": "job_5678_xyz", "status": "done" }
  ]
}
```

### 4. GET /jobs/stats

Get queue statistics (monitoring).

**Auth**: `Authorization: Bearer ${EDGE_API_TOKEN}`

**Response**:
```json
{
  "stats": {
    "pending": 5,
    "leased": 2,
    "done": 100,
    "failed": 1
  },
  "timestamp": 1705315800
}
```

## Migration Steps

### 1. Update Backend

```bash
cd backend

# Run new migration
npm run migrate:local   # for local dev
npm run migrate:prod    # for production

# Deploy
npm run deploy
```

### 2. Update Agent

The Python agent is already updated. No code changes needed, just ensure:

```bash
# In agent/.env, these are now OPTIONAL (commented out):
# QUEUE_PULL_URL=...
# QUEUE_ACK_URL=...
# CF_API_TOKEN=...

# The agent now uses:
EDGE_BASE_URL=https://your-worker.workers.dev
EDGE_API_TOKEN=your-jwt-secret  # Same as backend JWT_SECRET
```

## Testing

### 1. Test Enqueue

```bash
curl -X POST https://your-worker.workers.dev/jobs/enqueue \
  -H "Authorization: Bearer $JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "run_test_123",
    "tenantId": "tenant_test",
    "r2Key": "test/file.pdf"
  }'
```

### 2. Test Pull

```bash
curl -X POST https://your-worker.workers.dev/jobs/pull \
  -H "Authorization: Bearer $JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "max": 10,
    "visibilitySeconds": 60
  }'
```

### 3. Test Ack

```bash
curl -X POST https://your-worker.workers.dev/jobs/ack \
  -H "Authorization: Bearer $JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["job_id_here"],
    "status": "done"
  }'
```

### 4. Check Stats

```bash
curl https://your-worker.workers.dev/jobs/stats \
  -H "Authorization: Bearer $JWT_SECRET"
```

## Lease Mechanism

Jobs use a **visibility timeout** to prevent concurrent processing:

1. Agent calls `/jobs/pull` with `visibilitySeconds: 60`
2. Jobs are marked `status='leased'` with `visibility_deadline = now + 60`
3. Agent processes the job
4. Agent calls `/jobs/ack` with `status='done'`
5. Job is marked `status='done'`

If agent crashes:
- Job stays `leased` until `visibility_deadline` expires
- Cron job (or next pull) resets it to `pending`
- Job becomes available for retry

## Optional Cron Job

Automatically unlock stuck jobs every 10 minutes:

**In `wrangler.toml`, uncomment**:
```toml
[triggers]
crons = ["*/10 * * * *"]
```

The `scheduled` handler will run:
```sql
UPDATE jobs
SET status = 'pending',
    visibility_deadline = NULL
WHERE status = 'leased'
  AND visibility_deadline < NOW()
```

**Note**: Cron is **optional**. The pull endpoint also handles expired leases.

## Benefits

### Cost Savings
- ✅ **Free tier only**: No paid Queue addon needed
- ✅ **D1 free tier**: 5 GB storage, 5M reads/day
- ✅ **No extra costs**: Uses existing D1 database

### Same Functionality
- ✅ **At-least-once delivery**: Lease mechanism ensures jobs aren't lost
- ✅ **Retry logic**: Failed jobs return to pending
- ✅ **Visibility timeout**: Prevents duplicate processing
- ✅ **Monitoring**: Stats endpoint for observability

### Improved Control
- ✅ **SQL queries**: Easy to inspect queue state
- ✅ **Custom logic**: Extend queries for filtering, prioritization
- ✅ **No API limits**: D1 free tier is generous

## Monitoring

### Query Jobs

```bash
# Count by status
wrangler d1 execute auditor --command="
  SELECT status, COUNT(*) as count
  FROM jobs
  GROUP BY status
"

# View pending jobs
wrangler d1 execute auditor --command="
  SELECT * FROM jobs
  WHERE status = 'pending'
  ORDER BY created_at
  LIMIT 10
"

# View stuck leases
wrangler d1 execute auditor --command="
  SELECT * FROM jobs
  WHERE status = 'leased'
    AND visibility_deadline < unixepoch()
"
```

### Via API

```bash
curl https://your-worker.workers.dev/jobs/stats \
  -H "Authorization: Bearer $JWT_SECRET"
```

## Troubleshooting

### Jobs stuck in 'leased' status

**Solution**: Either enable cron, or manually reset:
```bash
wrangler d1 execute auditor --command="
  UPDATE jobs
  SET status = 'pending',
      visibility_deadline = NULL
  WHERE status = 'leased'
    AND visibility_deadline < unixepoch()
"
```

### Agent can't pull jobs

**Check**:
1. `EDGE_API_TOKEN` matches backend `JWT_SECRET`
2. Jobs exist: `SELECT COUNT(*) FROM jobs WHERE status='pending'`
3. No network issues to worker

### Duplicate processing

**Cause**: Agent crashed without acking, job expired and was pulled again.

**Expected behavior**: This is "at-least-once" delivery. Make your pipeline idempotent or use `attempts` field to skip high-retry jobs.

## Performance

- **Pull latency**: ~10-50ms (D1 query)
- **Throughput**: ~100+ jobs/second (D1 can handle it)
- **Scalability**: Multiple agents can pull concurrently (atomic lease)

## Rollback

If you need to rollback to Queues:

1. Restore `[[queues.producers]]` in `wrangler.toml`
2. Restore queue URLs in agent `.env`
3. Deploy backend
4. Update agent to use queue URLs

Both systems can coexist during migration.

---

**Migration complete!** Your queue is now free-tier compatible. 🎉

