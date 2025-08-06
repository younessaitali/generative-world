import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { resourceVeins } from '~~/server/database/schema';
import { sql } from 'drizzle-orm';

const nearbyResourcesSchema = z.object({
  x: z.coerce.number(),
  y: z.coerce.number(),
  radius: z.coerce.number().min(1).max(1000).default(100),
  resourceType: z.string().optional(),
});

export default defineValidatedEventHandler({ query: nearbyResourcesSchema }, async (event) => {
  const { x, y, radius, resourceType } = event.context.validated.query;
  try {
    const queryPoint = sql`ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326)`;

    let whereClause = sql`ST_DWithin(${resourceVeins.centerPoint}, ${queryPoint}, ${radius})`;

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
