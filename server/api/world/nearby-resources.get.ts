import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { resourceVeins } from '~~/server/database/schema';
import { sql } from 'drizzle-orm';
import { ensureChunksHavePersistedVeins } from '~~/server/utils/resource-generator';
import { WORLD_CONFIG } from '~~/app/config/world.config';

const nearbyResourcesSchema = z.object({
  x: z.coerce.number(),
  y: z.coerce.number(),
  radius: z.coerce.number().min(1).max(1000).default(100),
  resourceType: z.string().optional(),
});

function getChunksInRadius(x: number, y: number, radius: number, chunkSize: number) {
  const minChunkX = Math.floor((x - radius) / chunkSize);
  const maxChunkX = Math.floor((x + radius) / chunkSize);
  const minChunkY = Math.floor((y - radius) / chunkSize);
  const maxChunkY = Math.floor((y + radius) / chunkSize);

  const chunks = [];
  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      chunks.push({ chunkX, chunkY });
    }
  }
  return chunks;
}

export default defineValidatedEventHandler({ query: nearbyResourcesSchema }, async (event) => {
  const { x, y, radius, resourceType } = event.context.validated.query;
  const worldId = event.context.player.worldId;

  try {
    const requiredChunks = getChunksInRadius(x, y, radius, WORLD_CONFIG.chunk.size);

    await ensureChunksHavePersistedVeins(requiredChunks, worldId, WORLD_CONFIG.chunk.size);

    const queryPoint = sql`ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326)`;

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
    return {
      success: true,
      query: { x, y, radius, resourceType },
      totalFound: nearbyVeins.length,
      resources: nearbyVeins,
    };
  } catch (error) {
    console.error('Failed to query nearby resources:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to query nearby resources',
    });
  }
});
