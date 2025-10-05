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

  // Handle Gemini API format (contents + generationConfig)
  if (body.contents && Array.isArray(body.contents) && body.generationConfig) {
    // This is a Gemini API request - call Google AI Studio directly
    try {
      console.log('LLM Gateway: Processing Gemini request');
      console.log('LLM Gateway: Google API Key exists:', !!c.env.GOOGLE_API_KEY);
      console.log('LLM Gateway: Google API Key value:', c.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET');
      
      const apiKey = c.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error('LLM Gateway: Google API key is not configured');
        throw new ServerError('Google API key not configured');
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      console.log('LLM Gateway: Calling URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('LLM Gateway: Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Google AI Studio error:', error);
        throw new ServerError('Google AI Studio request failed');
      }

      const result = await response.json();
      console.log('LLM Gateway: Success, returning result');
      return c.json(result);
    } catch (error) {
      console.error('LLM gateway failed:', error);
      throw new ServerError('Failed to process LLM request');
    }
  }

  // Handle legacy format
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

  const body = await c.req.json();

  // Handle Gemini API format (requests array)
  if (body.requests && Array.isArray(body.requests)) {
    // This is a Gemini embedding request - call Google AI Studio directly
    try {
      console.log('Embedding: Processing Gemini embedding request');
      console.log('Embedding: Google API Key exists:', !!c.env.GOOGLE_API_KEY);
      
      const apiKey = c.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error('Embedding: Google API key is not configured');
        throw new ServerError('Google API key not configured');
      }
      
      // Convert requests to Google AI Studio format
      const googleRequests = body.requests.map(req => ({
        model: req.model || "models/text-embedding-004",
        content: req.content
      }));
      
      const payload = {
        requests: googleRequests
      };
      
      console.log('Embedding: Calling Google AI Studio with payload:', JSON.stringify(payload));
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google AI Studio embedding error:', error);
        throw new ServerError('Google AI Studio embedding request failed');
      }

      const result = await response.json();
      return c.json(result);
    } catch (error) {
      console.error('Embedding failed:', error);
      throw new ServerError('Failed to generate embeddings');
    }
  }

  // Handle legacy format
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

