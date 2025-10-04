/**
 * Structured error handling with problem+json format
 */

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      type: `https://auditor.edge/errors/${this.code}`,
      status: this.status,
      code: this.code,
      title: this.message,
      detail: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, 'AUTH_ERROR', message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, 'SERVER_ERROR', message);
    this.name = 'ServerError';
  }
}

export function errorResponse(error: any): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), {
      status: error.status,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return Response.json(
    {
      type: 'https://auditor.edge/errors/server_error',
      status: 500,
      code: 'SERVER_ERROR',
      title: 'Internal server error',
    },
    {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    }
  );
}

