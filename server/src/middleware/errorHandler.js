import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: message || 'Invalid request body',
      },
    });
  }

  // Handle known HTTP status errors
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected server error occurred';

  console.error(`[Error] ${req.method} ${req.url} [${status} - ${code}]: ${message}`);
  if (status === 500 && process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  return res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

