/**
 * Authentication middleware for protected routes
 */

import { Context, Next } from 'hono';
import { AuthError } from './errors.js';
import { Env } from '../types.js';

/**
 * Middleware to require server authentication via Bearer token
 */
export async function requireServerAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);

  // Compare with JWT_SECRET (used as server auth token)
  if (token !== c.env.JWT_SECRET) {
    throw new AuthError('Invalid authentication token');
  }

  await next();
}

