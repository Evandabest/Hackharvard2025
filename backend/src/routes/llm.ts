/**
 * AI Gateway proxy for LLM and embedding calls
 */

import { Context } from 'hono';
import { Env } from '../types.js';
import { aiGatewaySchema } from '../lib/schema.js';
import { ValidationError, ServerError, AuthError } from '../lib/errors.js';

/**
 * POST /llm/gateway
 * Forward LLM requests through Cloudflare AI Gateway to Google AI Studio
 * This route requires server-side auth (not for client use)
 */
export async function llmGateway(c: Context<{ Bindings: Env }>): Promise<Response> {
  // Verify server auth (simple shared secret for server-to-server calls)
  const authHeader = c.req.header('X-Server-Auth');
  if (!authHeader || authHeader !== c.env.JWT_SECRET) {
    throw new AuthError('Server authentication required');
  }

  const body = await c.req.json();

  // Validate input
  const parsed = aiGatewaySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request', parsed.error.errors);
  }

  const { model, prompt, messages, temperature, maxTokens } = parsed.data;

  try {
    // Forward to AI Gateway
    const response = await fetch(c.env.AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        messages,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI Gateway error:', error);
      throw new ServerError('AI Gateway request failed');
    }

    const result = await response.json();
    return c.json(result);
  } catch (error) {
    console.error('LLM gateway failed:', error);
    throw new ServerError('Failed to process LLM request');
  }
}

/**
 * POST /llm/embed
 * Generate embeddings through AI Gateway
 */
export async function llmEmbed(c: Context<{ Bindings: Env }>): Promise<Response> {
  // Verify server auth
  const authHeader = c.req.header('X-Server-Auth');
  if (!authHeader || authHeader !== c.env.JWT_SECRET) {
    throw new AuthError('Server authentication required');
  }

  const body = await c.req.json<{ texts: string[] }>();

  if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
    throw new ValidationError('texts array is required');
  }

  try {
    // Forward to AI Gateway for embeddings
    const response = await fetch(`${c.env.AI_GATEWAY_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-004', // Google's embedding model
        input: body.texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Embedding error:', error);
      throw new ServerError('Embedding generation failed');
    }

    const result = await response.json();
    return c.json(result);
  } catch (error) {
    console.error('Embedding failed:', error);
    throw new ServerError('Failed to generate embeddings');
  }
}

