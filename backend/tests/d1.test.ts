/**
 * Tests for D1 proxy routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Env } from '../src/types';
import app from '../src/index';

// Mock D1 database
const createMockD1 = () => {
  const prepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({
      success: true,
      meta: { changes: 1, last_row_id: 1 },
    }),
    all: vi.fn().mockResolvedValue({
      results: [
        { id: 'run-123', tenant_id: 'tenant-1', status: 'pending' },
      ],
    }),
  });

  return { prepare };
};

const createMockEnv = (): Env => {
  return {
    DB: createMockD1() as any,
    VEC: {} as any,
    R2_BUCKET: {} as any,
    RUNROOM: {} as any,
    AI_GATEWAY_URL: 'https://gateway.test',
    TURNSTILE_SECRET: 'test-secret',
    JWT_SECRET: 'test-jwt-secret',
  };
};

describe('D1 Routes', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('POST /d1/query', () => {
    it('should execute whitelisted insert_run query', async () => {
      const payload = {
        name: 'insert_run',
        params: ['run-123', 'tenant-1', 'pending', 'key.pdf'],
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meta.changes).toBe(1);
      expect(env.DB.prepare).toHaveBeenCalledWith(
        'INSERT INTO runs (id, tenant_id, status, r2_key) VALUES (?, ?, ?, ?)'
      );
    });

    it('should execute whitelisted update_status query', async () => {
      const payload = {
        name: 'update_status',
        params: ['run-123', 'completed'],
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(env.DB.prepare).toHaveBeenCalledWith(
        'UPDATE runs SET status = ? WHERE id = ?'
      );
    });

    it('should execute whitelisted get_run query and return results', async () => {
      const payload = {
        name: 'get_run',
        params: ['run-123'],
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(data.count).toBe(1);
    });

    it('should reject non-whitelisted query', async () => {
      const payload = {
        name: 'drop_table',
        params: ['runs'],
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should reject wrong number of parameters', async () => {
      const payload = {
        name: 'insert_run',
        params: ['run-123', 'tenant-1'], // Should be 4 params
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.title).toContain('expects 4 parameters');
    });

    it('should reject invalid schema', async () => {
      const payload = {
        query: 'SELECT * FROM runs',
        params: [],
      };

      const req = new Request('http://localhost/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});

