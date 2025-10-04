/**
 * Upload routes - R2 signed URL generation
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { createUploadSchema } from '../lib/schema.js';
import { createSignedUploadUrl, generateObjectKey } from '../lib/r2.js';
import { ValidationError } from '../lib/errors.js';
import { generateJobId, nowSeconds } from '../lib/jobs.js';

/**
 * POST /uploads/create
 * Generate signed R2 upload URL and create run record
 */
export async function createUpload(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();
  
  // Validate input
  const parsed = createUploadSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { contentType, filename, tenantId } = parsed.data;

  // Generate unique run ID
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Generate R2 object key
  const r2Key = generateObjectKey(tenantId, runId, filename);

  // Create signed upload URL
  const { putUrl } = await createSignedUploadUrl({
    bucket: c.env.R2_BUCKET,
    key: r2Key,
    contentType,
    expiresIn: 3600, // 1 hour
  });

  // Create run record in D1
  await c.env.DB.prepare(
    'INSERT INTO runs (id, tenant_id, status, r2_key) VALUES (?, ?, ?, ?)'
  )
    .bind(runId, tenantId, 'pending', r2Key)
    .run();

  // Create Durable Object instance for this run
  const doId = c.env.RUNROOM.idFromName(runId);
  const doStub = c.env.RUNROOM.get(doId);
  
  // Initialize the DO state
  await doStub.fetch('http://do/update', {
    method: 'POST',
    body: JSON.stringify({
      phase: 'uploading',
      percent: 0,
      message: 'Ready for upload',
    }),
  });

  return c.json({
    runId,
    r2PutUrl: putUrl,
    r2Key,
  }, 201);
}

