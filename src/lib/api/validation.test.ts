import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody } from './validation';

describe('validateBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive().optional(),
  });

  it('returns { data } for a valid body', () => {
    const result = validateBody(schema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ data: { name: 'Alice', age: 30 } });
  });

  it('returns { data } when optional fields are omitted', () => {
    const result = validateBody(schema, { name: 'Bob' });
    expect(result).toEqual({ data: { name: 'Bob' } });
  });

  it('returns { error: Response } with 400 status for invalid body', async () => {
    const result = validateBody(schema, { age: 'not-a-number' });

    expect('error' in result).toBe(true);
    if (!('error' in result)) return;

    const response = result.error;
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.error).toBe('Validation error');
    expect(body.message).toBe('Invalid request body');
    expect(body.details).toBeDefined();
    expect(body.details.name).toBeDefined();
    expect(body.details.age).toBeDefined();
  });

  it('returns field-level errors for each invalid field', async () => {
    const result = validateBody(schema, {});

    expect('error' in result).toBe(true);
    if (!('error' in result)) return;

    const body = await result.error.json();
    // name is required and missing
    expect(body.details.name).toEqual(expect.arrayContaining([expect.any(String)]));
    // age is optional, so no error
    expect(body.details.age).toBeUndefined();
  });

  it('strips unknown properties via schema passthrough', () => {
    // With a strict schema, extra keys generate errors; with the base schema they are stripped
    const result = validateBody(schema, { name: 'Charlie', extra: true });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Zod strips unknown keys by default
      expect((result.data as Record<string, unknown>).extra).toBeUndefined();
    }
  });

  it('works with string-only schemas', () => {
    const stringSchema = z.object({
      code: z.string().min(1),
      guestName: z.string().optional(),
    });

    const valid = validateBody(stringSchema, { code: 'ABC123' });
    expect('data' in valid).toBe(true);

    const invalid = validateBody(stringSchema, { code: '' });
    expect('error' in invalid).toBe(true);
  });
});
