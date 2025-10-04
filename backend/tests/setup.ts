/**
 * Test setup and global mocks
 */

import { vi } from 'vitest';

// Mock Cloudflare Workers globals
(global as any).Response = Response;
(global as any).Request = Request;
(global as any).Headers = Headers;

// Mock crypto for JWT
if (!(global as any).crypto) {
  (global as any).crypto = {
    subtle: {
      sign: vi.fn(),
      verify: vi.fn(),
      digest: vi.fn(),
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
    },
    getRandomValues: vi.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  } as any;
}

