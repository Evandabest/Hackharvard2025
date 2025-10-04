/**
 * JWT utilities for authentication
 */

import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const TOKEN_EXPIRY = '15m'; // 15 minutes

export interface JWTPayload {
  sub: string; // tenant ID
  iat?: number;
  exp?: number;
  [key: string]: any; // Index signature for jose compatibility
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

