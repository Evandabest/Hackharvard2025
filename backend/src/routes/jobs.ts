/**
 * Job queue routes - D1-backed queue system (replaces Cloudflare Queues)
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { jobEnqueueSchema, jobPullSchema, jobAckSchema } from '../lib/schema.js';
import { ValidationError, ServerError } from '../lib/errors.js';
import { generateJobId, nowSeconds, leaseNow } from '../lib/jobs.js';

/**
 * POST /jobs/enqueue
 * Add a new job to the queue
 */
export async function enqueueJob(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = jobEnqueueSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { runId, tenantId, r2Key } = parsed.data;

  try {
    // Generate job ID
    const jobId = generateJobId();
    const now = nowSeconds();

    // Insert job into D1
    await c.env.DB.prepare(
      `INSERT INTO jobs (id, run_id, tenant_id, r2_key, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`
    )
      .bind(jobId, runId, tenantId, r2Key, now, now)
      .run();

    // Update RunRoom DO to indicate queued status
    const doId = c.env.RUNROOM.idFromName(runId);
    const doStub = c.env.RUNROOM.get(doId);

    await doStub.fetch('http://do/update', {
      method: 'POST',
      body: JSON.stringify({
        phase: 'queued',
        percent: 5,
        message: 'Job queued for processing',
      }),
    });

    return c.json({
      success: true,
      jobId,
      runId,
      status: 'pending',
    }, 201);
  } catch (error) {
    console.error('Failed to enqueue job:', error);
    throw new ServerError('Failed to enqueue job');
  }
}

/**
 * POST /jobs/pull
 * Pull jobs from the queue with lease mechanism
 */
export async function pullJobs(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = jobPullSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { max, visibilitySeconds } = parsed.data;

  try {
    const now = nowSeconds();
    const newDeadline = leaseNow(visibilitySeconds);

    // Find eligible jobs (pending or expired leases, exclude failed)
    const eligibleJobs = await c.env.DB.prepare(
      `SELECT id, run_id, tenant_id, r2_key, attempts
       FROM jobs
       WHERE status IN ('pending', 'leased')
         AND (visibility_deadline IS NULL OR visibility_deadline < ?)
       ORDER BY created_at ASC
       LIMIT ?`
    )
      .bind(now, max)
      .all();

    if (!eligibleJobs.results || eligibleJobs.results.length === 0) {
      return c.json({ jobs: [] });
    }

    // Lease each job atomically
    const leasedJobs = [];

    for (const job of eligibleJobs.results) {
      try {
        // Atomically update the job to leased status
        const result = await c.env.DB.prepare(
          `UPDATE jobs
           SET status = 'leased',
               attempts = attempts + 1,
               visibility_deadline = ?,
               updated_at = ?
           WHERE id = ?
             AND (status IN ('pending', 'leased'))
             AND (visibility_deadline IS NULL OR visibility_deadline < ?)`
        )
          .bind(newDeadline, now, job.id, now)
          .run();

        // Only include if we successfully updated (no race condition)
        if (result.meta.changes > 0) {
          leasedJobs.push({
            id: job.id,
            runId: job.run_id,
            tenantId: job.tenant_id,
            r2Key: job.r2_key,
            attempts: Number(job.attempts) + 1,
          });
        }
      } catch (error) {
        console.error(`Failed to lease job ${job.id}:`, error);
        // Continue with other jobs
      }
    }

    return c.json({ jobs: leasedJobs });
  } catch (error) {
    console.error('Failed to pull jobs:', error);
    throw new ServerError('Failed to pull jobs');
  }
}

/**
 * POST /jobs/ack
 * Acknowledge job completion or failure
 */
export async function ackJobs(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = jobAckSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { ids, status } = parsed.data;

  try {
    const now = nowSeconds();
    const results = [];

    for (const jobId of ids) {
      try {
        // Get job details first
        const job = await c.env.DB.prepare(
          'SELECT run_id, status FROM jobs WHERE id = ?'
        )
          .bind(jobId)
          .first();

        if (!job) {
          console.warn(`Job ${jobId} not found`);
          continue;
        }

        // Update job based on status
        if (status === 'done') {
          // Mark as done
          await c.env.DB.prepare(
            `UPDATE jobs
             SET status = 'done',
                 visibility_deadline = NULL,
                 updated_at = ?
             WHERE id = ?`
          )
            .bind(now, jobId)
            .run();

          // Update RunRoom DO
          const doId = c.env.RUNROOM.idFromName(job.run_id as string);
          const doStub = c.env.RUNROOM.get(doId);

          await doStub.fetch('http://do/update', {
            method: 'POST',
            body: JSON.stringify({
              phase: 'processed',
              percent: 100,
              message: 'Processing complete',
            }),
          });

          results.push({ id: jobId, status: 'done' });
        } else {
          // Mark as failed permanently - do not requeue
          await c.env.DB.prepare(
            `UPDATE jobs
             SET status = 'failed',
                 visibility_deadline = NULL,
                 updated_at = ?
             WHERE id = ?`
          )
            .bind(now, jobId)
            .run();

          results.push({ id: jobId, status: 'failed_permanently' });
        }
      } catch (error) {
        console.error(`Failed to ack job ${jobId}:`, error);
        results.push({ id: jobId, status: 'error' });
      }
    }

    return c.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Failed to acknowledge jobs:', error);
    throw new ServerError('Failed to acknowledge jobs');
  }
}

/**
 * GET /jobs/stats
 * Get queue statistics (optional, useful for monitoring)
 */
export async function getJobStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const stats = await c.env.DB.prepare(
      `SELECT status, COUNT(*) as count
       FROM jobs
       GROUP BY status`
    ).all();

    const statusCounts: Record<string, number> = {};
    for (const row of stats.results || []) {
      statusCounts[row.status as string] = Number(row.count);
    }

    return c.json({
      stats: statusCounts,
      timestamp: nowSeconds(),
    });
  } catch (error) {
    console.error('Failed to get job stats:', error);
    throw new ServerError('Failed to get job stats');
  }
}

