/**
 * Auditor Edge API - Main router
 */

import { Hono } from 'hono';
import { Env } from './types.js';
import { errorResponse } from './lib/errors.js';
import { rateLimit } from './middleware/ratelimit.js';

// Route handlers
import { authStart } from './routes/auth.js';
import { createUpload, directUpload } from './routes/uploads.js';
import { enqueueRun, getRunStatus, getReportUrl, getReportContent } from './routes/runs.js';
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

// R2 test endpoint
app.get('/test-r2', async (c) => {
  try {
    console.log('Testing R2 binding...');
    console.log('R2_BUCKET type:', typeof c.env.R2_BUCKET);
    console.log('R2_BUCKET methods:', Object.getOwnPropertyNames(c.env.R2_BUCKET));
    
    // Try to list objects
    const objects = await c.env.R2_BUCKET.list();
    console.log('R2 objects count:', objects.objects.length);
    
    return c.json({
      success: true,
      bucketType: typeof c.env.R2_BUCKET,
      objectCount: objects.objects.length,
      methods: Object.getOwnPropertyNames(c.env.R2_BUCKET)
    });
  } catch (error) {
    console.error('R2 test error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      bucketType: typeof c.env.R2_BUCKET
    });
  }
});

// Auth routes
app.post('/auth/start', rateLimit({ maxTokens: 10, refillRate: 1 }), authStart);

// Upload routes
app.post('/uploads/create', rateLimit({ maxTokens: 20, refillRate: 2 }), createUpload);
app.post('/uploads/direct/:runId', rateLimit({ maxTokens: 50, refillRate: 5 }), directUpload);

// Run management routes
app.post('/runs/:runId/enqueue', rateLimit({ maxTokens: 20, refillRate: 2 }), enqueueRun);
app.get('/runs/:runId/status', rateLimit({ maxTokens: 60, refillRate: 10 }), getRunStatus);
app.get('/runs/:runId/report', rateLimit({ maxTokens: 60, refillRate: 10 }), getReportUrl);
app.get('/runs/:runId/report-content', rateLimit({ maxTokens: 60, refillRate: 10 }), getReportContent);

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

