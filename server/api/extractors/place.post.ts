import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { extractors, resourceClaims } from '~~/server/database/schema';
import { eq, sql } from 'drizzle-orm';
import { validateWorldCoordinates, validateExtractorPlacement } from '~~/server/utils/validation';
import { logger } from '#shared/utils/logger';

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

  validateWorldCoordinates(x, y);

  const placement = await validateExtractorPlacement({
    x,
    y,
    resourceType,
    playerId: player.id,
    worldId,
  });

  const result = await db.transaction(async (trx) => {
    if (!placement.existingClaimPlayerId) {
      await trx.insert(resourceClaims).values({
        playerId: player.id,
        resourceVeinId: placement.veinId,
        claimType: 'active',
      });
    } else if (placement.existingClaimPlayerId === player.id) {
      await trx
        .update(resourceClaims)
        .set({ lastActivity: new Date() })
        .where(eq(resourceClaims.resourceVeinId, placement.veinId));
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

  logger.info('Extractor placed', {
    service: 'ExtractorsAPI',
    method: 'place',
    metadata: { extractorId: result.id, veinId: placement.veinId, x, y, worldId, resourceType },
  });

  return {
    extractor: result,
    veinId: placement.veinId,
    status: 201,
  };
});
