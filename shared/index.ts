import { z } from 'zod/v4';

export * from './types/world';
export * from './utils/terrain';

export const uuidSchema = z.uuid({ message: 'Invalid UUID' });

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && uuidSchema.safeParse(value).success;
}
