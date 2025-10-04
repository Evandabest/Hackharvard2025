/**
 * Vectorize proxy routes
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { vectorUpsertSchema, vectorQuerySchema } from '../lib/schema.js';
import { ValidationError, ServerError } from '../lib/errors.js';

/**
 * POST /vector/upsert
 * Insert or update vectors in Vectorize index
 */
export async function vectorUpsert(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = vectorUpsertSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { ids, vectors, metadatas } = parsed.data;

  // Validate dimensions match
  if (vectors.length !== ids.length) {
    throw new ValidationError('Number of vectors must match number of IDs');
  }

  if (metadatas && metadatas.length !== ids.length) {
    throw new ValidationError('Number of metadata objects must match number of IDs');
  }

  try {
    // Prepare vectors for upsert
    const vectorObjects = ids.map((id, idx) => ({
      id,
      values: vectors[idx],
      metadata: metadatas ? metadatas[idx] : undefined,
    }));

    // Upsert to Vectorize
    await c.env.VEC.upsert(vectorObjects);

    return c.json({
      success: true,
      count: ids.length,
    });
  } catch (error) {
    console.error('Vectorize upsert failed:', error);
    throw new ServerError('Failed to upsert vectors');
  }
}

/**
 * POST /vector/query
 * Query vectors from Vectorize index
 */
export async function vectorQuery(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = vectorQuerySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { vector, topK, filter } = parsed.data;

  try {
    // Query Vectorize
    const results = await c.env.VEC.query(vector, {
      topK,
      filter,
      returnMetadata: true,
    });

    // Format response
    const matches = results.matches.map((match) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
    }));

    return c.json({ matches });
  } catch (error) {
    console.error('Vectorize query failed:', error);
    throw new ServerError('Failed to query vectors');
  }
}

