/**
 * Zod schemas for input validation
 */

import { z } from 'zod';

// Auth schemas
export const turnstileSchema = z.object({
  token: z.string().min(1, 'Turnstile token is required'),
});

// Upload schemas
export const createUploadSchema = z.object({
  contentType: z.string().regex(/^(application\/pdf|text\/csv)$/, 'Only PDF and CSV files allowed'),
  filename: z.string().min(1).max(255),
  tenantId: z.string().min(1).max(100),
});

// Run schemas
export const enqueueRunSchema = z.object({
  r2Key: z.string().min(1),
});

// Vector schemas
export const vectorUpsertSchema = z.object({
  ids: z.array(z.string()).min(1),
  vectors: z.array(z.array(z.number())).min(1),
  metadatas: z.array(z.record(z.any())).optional(),
});

export const vectorQuerySchema = z.object({
  vector: z.array(z.number()).min(1),
  topK: z.number().int().min(1).max(100).default(10),
  filter: z.record(z.any()).optional(),
});

// D1 query schemas
export const d1QuerySchema = z.object({
  name: z.enum(['insert_run', 'update_status', 'insert_finding', 'get_run', 'get_findings', 'insert_event']),
  params: z.array(z.any()),
});

// WebSocket message schema
export const wsMessageSchema = z.object({
  type: z.enum(['progress', 'message', 'done', 'error']),
  data: z.record(z.any()),
});

// AI Gateway schema
export const aiGatewaySchema = z.object({
  model: z.string(),
  prompt: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

// Job queue schemas
export const jobEnqueueSchema = z.object({
  runId: z.string().min(1),
  tenantId: z.string().min(1),
  r2Key: z.string().min(1),
});

export const jobPullSchema = z.object({
  max: z.number().int().min(1).max(100).default(10),
  visibilitySeconds: z.number().int().min(10).max(3600).default(60),
});

export const jobAckSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.enum(['done', 'failed']).default('done'),
});

