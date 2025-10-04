/**
 * Run management routes
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { enqueueRunSchema } from '../lib/schema.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';
import { generateJobId, nowSeconds } from '../lib/jobs.js';

/**
 * POST /runs/:runId/enqueue
 * Enqueue a run for processing
 */
export async function enqueueRun(c: Context<{ Bindings: Env }>): Promise<Response> {
  const runId = c.req.param('runId');
  const body = await c.req.json();

  // Validate input
  const parsed = enqueueRunSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { r2Key } = parsed.data;

  // Verify run exists
  const run = await c.env.DB.prepare(
    'SELECT id, tenant_id, status FROM runs WHERE id = ?'
  )
    .bind(runId)
    .first();

  if (!run) {
    throw new NotFoundError('Run');
  }

  // Update run status
  await c.env.DB.prepare(
    'UPDATE runs SET status = ? WHERE id = ?'
  )
    .bind('queued', runId)
    .run();

  // Enqueue job in D1-backed queue
  const jobId = generateJobId();
  const now = nowSeconds();

  await c.env.DB.prepare(
    `INSERT INTO jobs (id, run_id, tenant_id, r2_key, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`
  )
    .bind(jobId, runId, run.tenant_id, r2Key, now, now)
    .run();

  // Update DO state
  const doId = c.env.RUNROOM.idFromName(runId);
  const doStub = c.env.RUNROOM.get(doId);
  
  await doStub.fetch('http://do/update', {
    method: 'POST',
    body: JSON.stringify({
      phase: 'queued',
      percent: 5,
      message: 'Queued for processing',
    }),
  });

  return c.json({ success: true, status: 'queued', jobId });
}

/**
 * GET /runs/:runId/status
 * Get current run status from Durable Object
 */
export async function getRunStatus(c: Context<{ Bindings: Env }>): Promise<Response> {
  const runId = c.req.param('runId');

  // Verify run exists in D1
  const run = await c.env.DB.prepare(
    'SELECT id, tenant_id, status, created_at, summary FROM runs WHERE id = ?'
  )
    .bind(runId)
    .first();

  if (!run) {
    throw new NotFoundError('Run');
  }

  // Get real-time state from DO
  const doId = c.env.RUNROOM.idFromName(runId);
  const doStub = c.env.RUNROOM.get(doId);
  
  const doResponse = await doStub.fetch('http://do/status');
  const doState = await doResponse.json();

  return c.json({
    runId,
    tenantId: run.tenant_id,
    status: run.status,
    createdAt: run.created_at,
    summary: run.summary,
    realtime: doState,
  });
}

