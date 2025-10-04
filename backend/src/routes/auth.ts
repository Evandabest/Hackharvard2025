/**
 * Authentication routes - Turnstile validation and JWT minting
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { turnstileSchema } from '../lib/schema.js';
import { signJWT } from '../lib/jwt.js';
import { ValidationError, AuthError } from '../lib/errors.js';

/**
 * Verify Turnstile token with Cloudflare
 */
async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const data = await result.json<{ success: boolean; 'error-codes'?: string[] }>();
  return data.success;
}

/**
 * POST /auth/start
 * Validate Turnstile token and issue JWT
 */
export async function authStart(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json();
  
  // Validate input
  const parsed = turnstileSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { token } = parsed.data;

  // Verify Turnstile token
  const clientIP = c.req.header('CF-Connecting-IP');
  const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET, clientIP);

  if (!isValid) {
    throw new AuthError('Invalid Turnstile token');
  }

  // Generate a tenant ID (in production, you might derive this from user data)
  // For now, we'll use a combination of IP and timestamp
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Mint JWT
  const jwt = await signJWT({ sub: tenantId }, c.env.JWT_SECRET);

  return c.json({
    token: jwt,
    tenantId,
    expiresIn: 900, // 15 minutes in seconds
  });
}

