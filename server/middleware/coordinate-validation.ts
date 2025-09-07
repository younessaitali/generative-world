/**
 * Coordinate Validation Middleware
 *
 * Validates and normalizes coordinate inputs in API requests to ensure
 * consistent coordinate handling across the application.
 */

import type { H3Event } from 'h3';
import { createError, readBody, getQuery, getRouterParams } from 'h3';
import {
  validateCoordinates,
  normalizeWorldCoordinates,
  assertValidCoordinates,
  COORDINATE_BOUNDS,
} from '#shared/utils/coordinates';

export interface CoordinateValidationOptions {
  /**
   * Whether to normalize coordinates after validation
   */
  normalize?: boolean;
  /**
   * Whether to throw errors for invalid coordinates or just log warnings
   */
  strict?: boolean;
  /**
   * Custom coordinate field names to validate
   */
  fields?: {
    x?: string;
    y?: string;
  };
}

/**
 * Validates coordinates in request body, query, or params
 */
export async function validateRequestCoordinates(
  event: H3Event,
  source: 'body' | 'query' | 'params' = 'body',
  options: CoordinateValidationOptions = {},
) {
  const { normalize = true, strict = true, fields = { x: 'x', y: 'y' } } = options;

  let data: Record<string, unknown>;
  if (source === 'body') {
    data = await readBody(event);
  } else if (source === 'query') {
    data = getQuery(event);
  } else {
    data = getRouterParams(event);
  }

  if (!data) {
    if (strict) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request data is required',
      });
    }
    return;
  }

  const xField = fields.x || 'x';
  const yField = fields.y || 'y';

  let x = data[xField];
  let y = data[yField];

  if (x === undefined || y === undefined) {
    if (strict) {
      throw createError({
        statusCode: 400,
        statusMessage: `Missing coordinates: ${xField} and ${yField} are required`,
      });
    }
    return;
  }

  x = typeof x === 'string' ? Number.parseFloat(x) : x;
  y = typeof y === 'string' ? Number.parseFloat(y) : y;

  if (typeof x !== 'number' || typeof y !== 'number') {
    if (strict) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid coordinate types: ${xField} and ${yField} must be numbers`,
      });
    }
    return;
  }

  if (Number.isNaN(x) || Number.isNaN(y)) {
    if (strict) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid coordinate values: ${xField} and ${yField} must be valid numbers`,
      });
    }
    return;
  }

  if (!validateCoordinates(x, y)) {
    if (strict) {
      throw createError({
        statusCode: 400,
        statusMessage: `Coordinates out of bounds: ${xField} and ${yField} must be between ${COORDINATE_BOUNDS.min} and ${COORDINATE_BOUNDS.max}`,
      });
    }
    return;
  }

  if (normalize) {
    const normalized = normalizeWorldCoordinates(x, y);
    data[xField] = normalized.x;
    data[yField] = normalized.y;
  } else {
    data[xField] = x;
    data[yField] = y;
  }
}

/**
 * Middleware factory for validating coordinates in request bodies
 */
export function createCoordinateValidationMiddleware(options?: CoordinateValidationOptions) {
  return async (event: H3Event) => {
    await validateRequestCoordinates(event, 'body', options);
  };
}

/**
 * Middleware factory for validating coordinates in query parameters
 */
export function createQueryCoordinateValidationMiddleware(options?: CoordinateValidationOptions) {
  return async (event: H3Event) => {
    await validateRequestCoordinates(event, 'query', options);
  };
}

/**
 * Middleware factory for validating coordinates in route parameters
 */
export function createParamsCoordinateValidationMiddleware(options?: CoordinateValidationOptions) {
  return async (event: H3Event) => {
    await validateRequestCoordinates(event, 'params', options);
  };
}

/**
 * Validates multiple coordinate pairs in an array
 */
export function validateCoordinateArray(
  coordinates: Array<{ x: number; y: number }>,
  strict: boolean = true,
): Array<{ x: number; y: number }> {
  const validatedCoordinates: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];

    if (!coord || typeof coord.x !== 'number' || typeof coord.y !== 'number') {
      if (strict) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid coordinate at index ${i}: x and y must be numbers`,
        });
      }
      continue;
    }

    if (Number.isNaN(coord.x) || Number.isNaN(coord.y)) {
      if (strict) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid coordinate values at index ${i}: x and y must be valid numbers`,
        });
      }
      continue;
    }

    if (!validateCoordinates(coord.x, coord.y)) {
      if (strict) {
        throw createError({
          statusCode: 400,
          statusMessage: `Coordinates out of bounds at index ${i}: x and y must be between ${COORDINATE_BOUNDS.min} and ${COORDINATE_BOUNDS.max}`,
        });
      }
      continue;
    }

    const normalized = normalizeWorldCoordinates(coord.x, coord.y);
    validatedCoordinates.push(normalized);
  }

  return validatedCoordinates;
}

/**
 * Validates and normalizes coordinates in event handler context
 */
export function validateEventCoordinates(event: H3Event, coordinates: { x: number; y: number }) {
  try {
    assertValidCoordinates(coordinates.x, coordinates.y);
    return normalizeWorldCoordinates(coordinates.x, coordinates.y);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid coordinates: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Default coordinate validation middleware for API routes
 */
export default async function coordinateValidationMiddleware(event: H3Event) {
  // Only validate if request contains coordinate data
  const body = await readBody(event).catch(() => null);
  const query = getQuery(event);

  // Check for common coordinate field patterns
  const hasBodyCoordinates =
    body && ((body.x !== undefined && body.y !== undefined) || body.coordinates);
  const hasQueryCoordinates =
    query && ((query.x !== undefined && query.y !== undefined) || query.coordinates);

  if (hasBodyCoordinates) {
    await validateRequestCoordinates(event, 'body', { normalize: true, strict: true });
  }

  if (hasQueryCoordinates) {
    await validateRequestCoordinates(event, 'query', { normalize: true, strict: true });
  }
}
