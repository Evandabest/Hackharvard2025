/**
 * Tests for D1-backed job queue routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Env } from '../src/types';
import app from '../src/index';

// Mock D1 database
const createMockD1 = () => {
  const mockData: any = {};

  const prepare = vi.fn((sql: string) => {
    const bound: any[] = [];
    return {
      bind: vi.fn((...args: any[]) => {
        bound.push(...args);
        return {
          run: vi.fn().mockResolvedValue({
            success: true,
            meta: { changes: 1, last_row_id: 1 },
          }),
          first: vi.fn().mockResolvedValue({
            id: 'job-1',
            run_id: 'run-123',
            tenant_id: 'tenant-1',
            r2_key: 'test.pdf',
            status: 'pending',
            attempts: 0,
          }),
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: 'job-1',
                run_id: 'run-123',
                tenant_id: 'tenant-1',
                r2_key: 'test.pdf',
                attempts: 0,
              },
            ],
          }),
        };
      }),
      run: vi.fn().mockResolvedValue({
        success: true,
        meta: { changes: 1 },
      }),
    };
  });

  return { prepare };
};

const createMockEnv = (): Env => {
  return {
    DB: createMockD1() as any,
    R2_BUCKET: {} as any,
    VEC: {} as any,
    RUNROOM: {
      idFromName: vi.fn().mockReturnValue('do-id'),
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(new Response('OK')),
      }),
    } as any,
    AI_GATEWAY_URL: 'https://gateway.test',
    TURNSTILE_SECRET: 'test-secret',
    JWT_SECRET: 'test-jwt-secret',
  };
};

describe('Job Queue Routes', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('POST /jobs/enqueue', () => {
    it('should enqueue a job with valid auth', async () => {
      const payload = {
        runId: 'run-123',
        tenantId: 'tenant-1',
        r2Key: 'path/to/file.pdf',
      };

      const req = new Request('http://localhost/jobs/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.jobId).toBeDefined();
      expect(data.runId).toBe('run-123');
      expect(data.status).toBe('pending');
    });

    it('should reject without auth header', async () => {
      const payload = {
        runId: 'run-123',
        tenantId: 'tenant-1',
        r2Key: 'path/to/file.pdf',
      };

      const req = new Request('http://localhost/jobs/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(401);
      expect(data.code).toBe('AUTH_ERROR');
    });

    it('should reject with invalid auth token', async () => {
      const payload = {
        runId: 'run-123',
        tenantId: 'tenant-1',
        r2Key: 'path/to/file.pdf',
      };

      const req = new Request('http://localhost/jobs/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-token',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(401);
      expect(data.code).toBe('AUTH_ERROR');
    });

    it('should reject invalid payload', async () => {
      const payload = { runId: 'run-123' }; // Missing required fields

      const req = new Request('http://localhost/jobs/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /jobs/pull', () => {
    it('should pull jobs with valid auth', async () => {
      const payload = {
        max: 10,
        visibilitySeconds: 60,
      };

      const req = new Request('http://localhost/jobs/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.jobs).toBeDefined();
      expect(Array.isArray(data.jobs)).toBe(true);
    });

    it('should use default values', async () => {
      const payload = {};

      const req = new Request('http://localhost/jobs/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.jobs).toBeDefined();
    });

    it('should reject without auth', async () => {
      const req = new Request('http://localhost/jobs/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /jobs/ack', () => {
    it('should acknowledge jobs with done status', async () => {
      const payload = {
        ids: ['job-1', 'job-2'],
        status: 'done' as const,
      };

      const req = new Request('http://localhost/jobs/ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
    });

    it('should acknowledge jobs with failed status', async () => {
      const payload = {
        ids: ['job-1'],
        status: 'failed' as const,
      };

      const req = new Request('http://localhost/jobs/ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject without auth', async () => {
      const req = new Request('http://localhost/jobs/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['job-1'] }),
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it('should reject empty ids array', async () => {
      const payload = { ids: [] };

      const req = new Request('http://localhost/jobs/ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-secret',
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /jobs/stats', () => {
    it('should return job statistics', async () => {
      // Mock D1 to return stats
      env.DB.prepare = vi.fn((sql: string) => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [
            { status: 'pending', count: 5 },
            { status: 'done', count: 10 },
          ],
        }),
      })) as any;

      const req = new Request('http://localhost/jobs/stats', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-jwt-secret',
        },
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should reject without auth', async () => {
      const req = new Request('http://localhost/jobs/stats', {
        method: 'GET',
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });
  });
});

