import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { validateWorldCoordinates, validateExtractorPlacement } from '~~/server/utils/validation';
import { logger } from '#shared/utils/logger';

const validatePlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  resourceType: z.string(),
});

export default defineValidatedEventHandler({ body: validatePlacementSchema }, async (event) => {
  const player = event.context.player;
  if (!player) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const { x, y, resourceType } = event.context.validated.body;
  const worldId = player.worldId;

  try {
    validateWorldCoordinates(x, y);

    const placement = await validateExtractorPlacement({
      x,
      y,
      resourceType,
      playerId: player.id,
      worldId,
    });

    return {
      valid: true as const,
      veinId: placement.veinId,
      resourceType: placement.veinResourceType,
      claimedBy: placement.existingClaimPlayerId,
    };
  } catch (err: unknown) {
    const maybeErr = err as
      | { statusCode?: number; statusMessage?: string; data?: Record<string, unknown> }
      | undefined;
    const statusCode = maybeErr?.statusCode ?? 400;
    const statusMessage = maybeErr?.statusMessage ?? 'Invalid placement';

    logger.warn('Placement validation failed', {
      service: 'ExtractorsAPI',
      method: 'validate',
      metadata: { x, y, resourceType, worldId, statusCode, statusMessage },
    });

    return {
      valid: false as const,
      reason:
        (maybeErr?.data && typeof maybeErr.data === 'object' && 'message' in maybeErr.data
          ? (maybeErr.data.message as string)
          : undefined) || statusMessage,
      code: String(statusCode),
    };
  }
});
