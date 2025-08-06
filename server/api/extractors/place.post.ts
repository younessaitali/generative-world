import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { extractors, resourceVeins, resourceClaims } from '~~/server/database/schema';
import { eq, and, sql } from 'drizzle-orm';

const placeExtractorSchema = z.object({
  x: z.number(),
  y: z.number(),
  resourceType: z.string(),
});

export default defineValidatedEventHandler({ body: placeExtractorSchema }, async (event) => {
  const player = event.context.player;
  if (!player) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  const { x, y, resourceType } = event.context.validated.body;
  const worldId = player.worldId;

  const existingExtractor = await db.query.extractors.findFirst({
    where: and(eq(extractors.x, x), eq(extractors.y, y), eq(extractors.worldId, worldId)),
  });
  if (existingExtractor) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Extractor already exists at this location.',
    });
  }

  const resourceVeinsAtLocation = await db
    .select({
      id: resourceVeins.id,
      resourceType: resourceVeins.resourceType,
      density: resourceVeins.density,
    })
    .from(resourceVeins)
    .where(
      and(
        eq(resourceVeins.worldId, worldId),
        eq(resourceVeins.resourceType, resourceType),
        sql`ST_Within(ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326), ${resourceVeins.extractionArea})`,
      ),
    );

  if (resourceVeinsAtLocation.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No extractable resource vein found at this location.',
    });
  }

  const vein = resourceVeinsAtLocation[0];

  const existingClaim = await db.query.resourceClaims.findFirst({
    where: eq(resourceClaims.resourceVeinId, vein.id),
  });

  if (existingClaim && existingClaim.playerId !== player.id) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This resource vein is already claimed by another player.',
    });
  }

  const result = await db.transaction(async (trx) => {
    if (!existingClaim) {
      await trx.insert(resourceClaims).values({
        playerId: player.id,
        resourceVeinId: vein.id,
        claimType: 'active',
      });
    } else if (existingClaim.playerId === player.id) {
      await trx
        .update(resourceClaims)
        .set({ lastActivity: new Date() })
        .where(eq(resourceClaims.id, existingClaim.id));
    }

    const [created] = await trx
      .insert(extractors)
      .values({
        playerId: player.id,
        worldId,
        x,
        y,
        position: sql`ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326)`,
        resourceType,
        status: 'IDLE',
        efficiency: 1.0,
        lastTick: new Date(),
        storage: {},
      })
      .returning();

    return created;
  });

  return {
    extractor: result,
    veinId: vein.id,
    status: 201,
  };
});
