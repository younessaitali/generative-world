import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { resourceVeins } from '~~/server/database/schema';
import { sql } from 'drizzle-orm';
import { ensureChunksHavePersistedVeins } from '~~/server/utils/resource-generator';
import { WORLD_CONFIG } from '~~/app/config/world.config';
import { logger } from '#shared/utils/logger';
import {
  normalizeWorldCoordinates,
  assertValidCoordinates,
  MIN_RESOURCE_DISTANCE,
  type WorldCoordinate,
  calculateDistance,
} from '#shared/utils/coordinates';

const nearbyResourcesSchema = z.object({
  x: z.coerce.number(),
  y: z.coerce.number(),
  radius: z.coerce.number().min(1).max(1000).default(100),
  resourceType: z.string().optional(),
});

export default defineValidatedEventHandler({ query: nearbyResourcesSchema }, async (event) => {
  const { x, y, radius, resourceType } = event.context.validated.query;
  const worldId = event.context.player.worldId;

  try {
    assertValidCoordinates(x, y);
    const normalizedCoords = normalizeWorldCoordinates(x, y);

    const requiredChunks = getChunksInRadius(
      normalizedCoords.x,
      normalizedCoords.y,
      radius,
      WORLD_CONFIG.chunk.size,
    );

    await ensureChunksHavePersistedVeins(requiredChunks, worldId, WORLD_CONFIG.chunk.size);

    const queryPoint = sql`ST_SetSRID(ST_MakePoint(${normalizedCoords.x}, ${normalizedCoords.y}), 4326)`;

    let whereClause = sql`ST_DWithin(${resourceVeins.centerPoint}, ${queryPoint}, ${radius}) AND ${resourceVeins.worldId} = ${worldId}`;

    if (resourceType) {
      whereClause = sql`${whereClause} AND ${resourceVeins.resourceType} = ${resourceType}`;
    }

    const nearbyVeins = await db
      .select({
        id: resourceVeins.id,
        resourceType: resourceVeins.resourceType,
        centerX: resourceVeins.centerX,
        centerY: resourceVeins.centerY,
        radius: resourceVeins.radius,
        density: resourceVeins.density,
        quality: resourceVeins.quality,
        depth: resourceVeins.depth,
        isExhausted: resourceVeins.isExhausted,
        extractedAmount: resourceVeins.extractedAmount,
        distance: sql`ST_Distance(${resourceVeins.centerPoint}, ${queryPoint})`.as('distance'),
        withinExtractionArea: sql`ST_Within(${queryPoint}, ${resourceVeins.extractionArea})`.as(
          'within_extraction_area',
        ),
      })
      .from(resourceVeins)
      .where(whereClause)
      .orderBy(sql`ST_Distance(${resourceVeins.centerPoint}, ${queryPoint})`);

    // The resource generator should prevent duplicates, but as a safeguard,
    // we perform a de-duplication step here based on MIN_RESOURCE_DISTANCE.
    // This is a temporary measure until the generation logic is fully verified.
    const deduplicatedVeins: typeof nearbyVeins = [];
    for (const vein of nearbyVeins) {
      const currentCoord: WorldCoordinate = { x: vein.centerX, y: vein.centerY };

      const isDuplicate = deduplicatedVeins.some((existingVein) => {
        const existingCoord: WorldCoordinate = {
          x: existingVein.centerX,
          y: existingVein.centerY,
        };
        return calculateDistance(currentCoord, existingCoord) < MIN_RESOURCE_DISTANCE;
      });

      if (!isDuplicate) {
        const normalizedVeinCoords = normalizeWorldCoordinates(vein.centerX, vein.centerY);
        deduplicatedVeins.push({
          ...vein,
          centerX: normalizedVeinCoords.x,
          centerY: normalizedVeinCoords.y,
        });
      }
    }

    return {
      success: true,
      query: {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        radius,
        resourceType,
      },
      totalFound: deduplicatedVeins.length,
      resources: deduplicatedVeins,
      deduplicationInfo: {
        originalCount: nearbyVeins.length,
        deduplicatedCount: deduplicatedVeins.length,
        removedCount: nearbyVeins.length - deduplicatedVeins.length,
      },
    };
  } catch (error) {
    logger.error('Failed to query nearby resources', {
      service: 'WorldAPI',
      method: 'nearby-resources',
      metadata: { x, y, radius, resourceType },
      error: (error as Error).message,
    });
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to query nearby resources',
    });
  }
});
