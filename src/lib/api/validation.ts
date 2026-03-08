import { type ZodSchema } from 'zod';

/**
 * Validate a request body against a Zod schema.
 *
 * Returns `{ data }` on success or `{ error: Response }` with a 400 status
 * and field-level error details on failure.
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { data: T } | { error: Response } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'Validation error',
          message: 'Invalid request body',
          details: result.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }
  return { data: result.data };
}
