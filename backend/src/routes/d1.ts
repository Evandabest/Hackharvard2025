/**
 * D1 database proxy with whitelisted queries
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { d1QuerySchema } from '../lib/schema.js';
import { ValidationError, ServerError } from '../lib/errors.js';

/**
 * Whitelisted query definitions
 */
const QUERIES = {
  insert_run: {
    sql: 'INSERT INTO runs (id, tenant_id, status, r2_key) VALUES (?, ?, ?, ?)',
    paramCount: 4,
  },
  update_status: {
    sql: 'UPDATE runs SET status = ? WHERE id = ?',
    paramCount: 2,
  },
  insert_finding: {
    sql: 'INSERT INTO findings (id, run_id, code, severity, title, detail, evidence_r2_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
    paramCount: 7,
  },
  get_run: {
    sql: 'SELECT * FROM runs WHERE id = ?',
    paramCount: 1,
  },
  get_findings: {
    sql: 'SELECT * FROM findings WHERE run_id = ? ORDER BY created_at DESC',
    paramCount: 1,
  },
  insert_event: {
    sql: 'INSERT INTO events (id, run_id, level, message, data) VALUES (?, ?, ?, ?, ?)',
    paramCount: 5,
  },
};

/**
 * POST /d1/query
 * Execute whitelisted parameterized query
 */
export async function d1Query(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();

  // Validate input
  const parsed = d1QuerySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { name, params } = parsed.data;

  // Get whitelisted query
  const query = QUERIES[name];
  if (!query) {
    throw new ValidationError(`Query '${name}' is not whitelisted`);
  }

  // Validate parameter count
  if (params.length !== query.paramCount) {
    throw new ValidationError(
      `Query '${name}' expects ${query.paramCount} parameters, got ${params.length}`
    );
  }

  try {
    // Execute query
    const stmt = c.env.DB.prepare(query.sql);
    const result = await stmt.bind(...params).run();

    // Handle different query types
    if (name.startsWith('get_')) {
      // SELECT queries - return results
      const data = await stmt.bind(...params).all();
      return c.json({
        success: true,
        results: data.results,
        count: data.results?.length || 0,
      });
    } else {
      // INSERT/UPDATE queries - return metadata
      return c.json({
        success: result.success,
        meta: result.meta,
      });
    }
  } catch (error) {
    console.error('D1 query failed:', error);
    throw new ServerError('Database query failed');
  }
}

