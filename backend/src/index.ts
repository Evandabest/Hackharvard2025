/**
 * Auditor Edge API - Main router
 */

import { Hono } from 'hono';
import { Env } from './types.js';
import { errorResponse } from './lib/errors.js';
import { rateLimit } from './middleware/ratelimit.js';

// Route handlers
import { authStart } from './routes/auth.js';
import { createUpload } from './routes/uploads.js';
import { enqueueRun, getRunStatus } from './routes/runs.js';
import { vectorUpsert, vectorQuery } from './routes/vector.js';
import { d1Query } from './routes/d1.js';
import { llmGateway, llmEmbed } from './routes/llm.js';
import { wsRunConnection } from './routes/ws.js';
import { enqueueJob, pullJobs, ackJobs, getJobStats } from './routes/jobs.js';
import { requireServerAuth } from './lib/auth.js';

// Export Durable Object
export { RunRoom } from './do/RunRoom.js';

// Export scheduled handler
export { scheduled } from './scheduled.js';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global error handler
app.onError((err, c) => {
  console.error('Request error:', err);
  return errorResponse(err);
});

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'auditor-edge',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Auth routes
app.post('/auth/start', rateLimit({ maxTokens: 10, refillRate: 1 }), authStart);

// Upload routes
app.post('/uploads/create', rateLimit({ maxTokens: 20, refillRate: 2 }), createUpload);

// Run management routes
app.post('/runs/:runId/enqueue', rateLimit({ maxTokens: 20, refillRate: 2 }), enqueueRun);
app.get('/runs/:runId/status', rateLimit({ maxTokens: 60, refillRate: 10 }), getRunStatus);

// WebSocket routes
app.get('/ws/run/:runId', wsRunConnection);

// Vector routes
app.post('/vector/upsert', rateLimit({ maxTokens: 30, refillRate: 3 }), vectorUpsert);
app.post('/vector/query', rateLimit({ maxTokens: 60, refillRate: 6 }), vectorQuery);

// D1 proxy routes
app.post('/d1/query', rateLimit({ maxTokens: 30, refillRate: 3 }), d1Query);

// LLM/AI Gateway routes (server-only)
app.post('/llm/gateway', rateLimit({ maxTokens: 10, refillRate: 1 }), llmGateway);
app.post('/llm/embed', rateLimit({ maxTokens: 10, refillRate: 1 }), llmEmbed);

// Job queue routes (server-only, requires auth)
app.post('/jobs/enqueue', requireServerAuth, rateLimit({ maxTokens: 50, refillRate: 5 }), enqueueJob);
app.post('/jobs/pull', requireServerAuth, rateLimit({ maxTokens: 30, refillRate: 3 }), pullJobs);
app.post('/jobs/ack', requireServerAuth, rateLimit({ maxTokens: 50, refillRate: 5 }), ackJobs);
app.get('/jobs/stats', requireServerAuth, rateLimit({ maxTokens: 20, refillRate: 2 }), getJobStats);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;

