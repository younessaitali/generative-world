import { and, eq, sql } from 'drizzle-orm';
import { db } from '~~/server/database/connection';
import { extractors, resourceClaims, resourceVeins } from '~~/server/database/schema';
import { ensureChunksHavePersistedVeins } from '~~/server/utils/resource-generator';
import { WORLD_CONFIG } from '~~/app/config/world.config';
import { logger } from '#shared/utils/logger';

export interface ExtractorPlacementInput {
  x: number;
  y: number;
  resourceType: string;
  playerId: string;
  worldId: string;
}

export interface ExtractorPlacementContext {
  veinId: string;
  veinResourceType: string;
  existingClaimPlayerId: string | null;
}

function throwValidationError(
  statusCode: number,
  statusMessage: string,
  data?: Record<string, unknown>,
): never {
  throw createError({ statusCode, statusMessage, data: data ?? { message: statusMessage } });
}

export function validateWorldCoordinates(x: number, y: number): { x: number; y: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throwValidationError(422, 'Invalid coordinates: x and y must be finite numbers', { x, y });
  }
  return { x, y };
}

export async function validateResourceOwnership(
  playerId: string,
  resourceVeinId: string,
): Promise<void> {
  logger.debug('Validating resource ownership', {
    service: 'Validation',
    method: 'validateResourceOwnership',
    metadata: { playerId, resourceVeinId },
  });

  const claim = await db.query.resourceClaims.findFirst({
    where: eq(resourceClaims.resourceVeinId, resourceVeinId),
  });

  if (!claim) {
    throwValidationError(404, 'No claim exists for the requested resource vein', {
      resourceVeinId,
    });
  }
  if (claim.playerId !== playerId) {
    throwValidationError(403, 'Resource vein is claimed by another player', { resourceVeinId });
  }
}

export async function validateExtractorPlacement(
  input: ExtractorPlacementInput,
): Promise<ExtractorPlacementContext> {
  const { x, y, resourceType, playerId, worldId } = input;
  logger.debug('Validating extractor placement', {
    service: 'Validation',
    method: 'validateExtractorPlacement',
    metadata: { x, y, resourceType, playerId, worldId },
  });

  const chunkSize = WORLD_CONFIG.chunk.size;
  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  await ensureChunksHavePersistedVeins([{ chunkX, chunkY }], worldId, chunkSize);

  const existingExtractor = await db.query.extractors.findFirst({
    where: and(eq(extractors.x, x), eq(extractors.y, y), eq(extractors.worldId, worldId)),
  });
  if (existingExtractor) {
    throwValidationError(409, 'Extractor already exists at this location', {
      x,
      y,
      worldId,
      extractorId: existingExtractor.id,
    });
  }

  const veinsAtLocation = await db
    .select({ id: resourceVeins.id, resourceType: resourceVeins.resourceType })
    .from(resourceVeins)
    .where(
      and(
        eq(resourceVeins.worldId, worldId),
        eq(resourceVeins.resourceType, resourceType),
        sql`ST_Within(ST_SetSRID(ST_MakePoint(${x}, ${y}), 4326), ${resourceVeins.extractionArea})`,
      ),
    );

  if (veinsAtLocation.length === 0) {
    throwValidationError(404, 'No extractable resource vein found at this location', {
      x,
      y,
      worldId,
      resourceType,
    });
  }

  const vein = veinsAtLocation[0];

  const existingClaim = await db.query.resourceClaims.findFirst({
    where: eq(resourceClaims.resourceVeinId, vein.id),
  });

  if (existingClaim && existingClaim.playerId !== playerId) {
    throwValidationError(409, 'This resource vein is already claimed by another player', {
      veinId: vein.id,
      claimedBy: existingClaim.playerId,
    });
  }

  return {
    veinId: vein.id,
    veinResourceType: vein.resourceType,
    existingClaimPlayerId: existingClaim?.playerId ?? null,
  };
}
