/**
 * Tests for Vectorize proxy routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Env } from '../src/types';
import app from '../src/index';

// Mock environment
const createMockEnv = (): Env => {
  const mockVectorize = {
    upsert: vi.fn().mockResolvedValue({ mutationId: 'test-mutation-123' }),
    query: vi.fn().mockResolvedValue({
      matches: [
        { id: 'vec-1', score: 0.95, metadata: { text: 'test' } },
        { id: 'vec-2', score: 0.87, metadata: { text: 'example' } },
      ],
    }),
  };

  return {
    VEC: mockVectorize as any,
    R2_BUCKET: {} as any,
    DB: {} as any,
    RUNROOM: {} as any,
    AI_GATEWAY_URL: 'https://gateway.test',
    TURNSTILE_SECRET: 'test-secret',
    JWT_SECRET: 'test-jwt-secret',
  };
};

describe('Vector Routes', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('POST /vector/upsert', () => {
    it('should successfully upsert vectors', async () => {
      const payload = {
        ids: ['vec-1', 'vec-2'],
        vectors: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
        metadatas: [{ text: 'hello' }, { text: 'world' }],
      };

      const req = new Request('http://localhost/vector/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(env.VEC.upsert).toHaveBeenCalledWith([
        { id: 'vec-1', values: [0.1, 0.2, 0.3], metadata: { text: 'hello' } },
        { id: 'vec-2', values: [0.4, 0.5, 0.6], metadata: { text: 'world' } },
      ]);
    });

    it('should reject mismatched vector and ID counts', async () => {
      const payload = {
        ids: ['vec-1'],
        vectors: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
      };

      const req = new Request('http://localhost/vector/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid input schema', async () => {
      const payload = {
        ids: 'not-an-array',
        vectors: [[0.1, 0.2]],
      };

      const req = new Request('http://localhost/vector/upsert', {
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

  describe('POST /vector/query', () => {
    it('should successfully query vectors', async () => {
      const payload = {
        vector: [0.1, 0.2, 0.3],
        topK: 5,
        filter: { category: 'test' },
      };

      const req = new Request('http://localhost/vector/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.matches).toHaveLength(2);
      expect(data.matches[0]).toEqual({
        id: 'vec-1',
        score: 0.95,
        metadata: { text: 'test' },
      });
      expect(env.VEC.query).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
        topK: 5,
        filter: { category: 'test' },
        returnMetadata: true,
      });
    });

    it('should use default topK when not provided', async () => {
      const payload = {
        vector: [0.1, 0.2, 0.3],
      };

      const req = new Request('http://localhost/vector/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      expect(env.VEC.query).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
        topK: 10,
        filter: undefined,
        returnMetadata: true,
      });
    });

    it('should reject empty vector', async () => {
      const payload = {
        vector: [],
        topK: 5,
      };

      const req = new Request('http://localhost/vector/query', {
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

