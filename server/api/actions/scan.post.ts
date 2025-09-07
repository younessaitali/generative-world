import { z } from 'zod/v4';
import { createError } from 'h3';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { ensureChunksHavePersistedVeins } from '~~/server/utils/resource-generator';
import {
  normalizeWorldCoordinates,
  worldToFullCoordinate,
  getChunksInRadius,
  assertValidCoordinates,
  calculateDistance,
} from '#shared/utils/coordinates';
import type {
  ResourceVein,
  ScanLevel,
  ResourceType,
  ResourceGrade,
  ClimateType,
  ExtendedTerrainType,
  FormationType,
  EnvironmentalHazard,
  ProximityEffects,
} from '#shared/types/world';
import { ScanLevel as ScanLevelEnum } from '#shared/types/world';
import { db } from '~~/server/database/connection';
import { playerScans, resourceVeins } from '~~/server/database/schema';
import { sql } from 'drizzle-orm';

const scanBodySchema = z.object({
  x: z.number().min(-1000000).max(1000000),
  y: z.number().min(-1000000).max(1000000),
  searchRadius: z.number().min(0).max(5).optional().default(2),
});

interface ScanResult {
  success: boolean;
  playerId?: string;
  discovered?: ResourceVein;
  coordinates: {
    worldX: number;
    worldY: number;
    chunkX: number;
    chunkY: number;
    cellX: number;
    cellY: number;
  };
  scanLevel: ScanLevel;
  timestamp: string;
  message?: string;
}

async function findNearbyResourceInDatabase(
  targetX: number,
  targetY: number,
  radius: number,
  worldId: string,
  chunkSize: number,
): Promise<ResourceVein | null> {
  const normalizedCoords = normalizeWorldCoordinates(targetX, targetY);
  const { x: normalizedX, y: normalizedY } = normalizedCoords;

  const chunksToCheck = getChunksInRadius(normalizedX, normalizedY, radius, chunkSize);

  await ensureChunksHavePersistedVeins(chunksToCheck, worldId, chunkSize);

  const queryPoint = sql`ST_SetSRID(ST_MakePoint(${normalizedX}, ${normalizedY}), 4326)`;

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
    })
    .from(resourceVeins)
    .where(
      sql`ST_DWithin(${resourceVeins.centerPoint}, ${queryPoint}, ${radius})
          AND ${resourceVeins.worldId} = ${worldId}`,
    )
    .orderBy(sql`ST_Distance(${resourceVeins.centerPoint}, ${queryPoint})`)
    .limit(1);

  if (nearbyVeins.length === 0) {
    return null;
  }

  const vein = nearbyVeins[0];

  const veinCoords = normalizeWorldCoordinates(vein.centerX, vein.centerY);
  const veinFullCoords = worldToFullCoordinate(veinCoords.x, veinCoords.y, chunkSize);

  return {
    id: vein.id as string,
    type: vein.resourceType as ResourceType,
    location: {
      worldX: veinCoords.x,
      worldY: veinCoords.y,
      chunkX: veinFullCoords.chunkX,
      chunkY: veinFullCoords.chunkY,
      cellX: veinFullCoords.cellX,
      cellY: veinFullCoords.cellY,
    },
    deposit: {
      size: Math.PI * vein.radius * vein.radius,
      richness: vein.density,
      depth: vein.depth || 1,
      accessibility: 0.8,
      formation: 'SEDIMENTARY' as FormationType,
    },
    quality: {
      purity: vein.quality,
      grade:
        vein.quality > 0.8
          ? ('ULTRA' as ResourceGrade)
          : vein.quality > 0.6
            ? ('HIGH' as ResourceGrade)
            : ('MEDIUM' as ResourceGrade),
      complexity: 0.5,
      yield: vein.quality * vein.density,
    },
    discovery: {
      isDiscovered: true,
      confidence: 0.9,
      scanLevel: ScanLevelEnum.SURFACE,
      discoveredAt: new Date().toISOString(),
    },
    extraction: {
      totalExtracted: vein.extractedAmount,
      remainingReserves: Math.PI * vein.radius * vein.radius * vein.density - vein.extractedAmount,
      depletion: vein.extractedAmount / (Math.PI * vein.radius * vein.radius * vein.density),
      lastExtracted: new Date().toISOString(),
      extractionRate: 1.0,
    },
    environment: {
      terrain: 'PLAINS' as ExtendedTerrainType,
      climate: 'TEMPERATE' as ClimateType,
      hazards: [] as EnvironmentalHazard[],
      proximity: {} as ProximityEffects,
    },
    metadata: {
      generated: new Date().toISOString(),
      seed: Math.floor(veinCoords.x * 1000 + veinCoords.y),
      version: '1.0',
      tags: [],
    },
  };
}

/**
 * POST /api/actions/scan
 *
 * Scans a specific world coordinate for resource veins.
 * This is the primary discovery action for players.
 * Requires player authentication via middleware.
 */
export default defineValidatedEventHandler(
  {
    body: scanBodySchema,
  },
  async (event): Promise<ScanResult> => {
    const { x: worldX, y: worldY, searchRadius } = event.context.validated.body;

    const player = event.context.player;
    const playerId = event.context.playerId;

    if (!player || !playerId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Player authentication required',
      });
    }

    assertValidCoordinates(worldX, worldY);
    const normalizedCoords = normalizeWorldCoordinates(worldX, worldY);
    const fullCoords = worldToFullCoordinate(normalizedCoords.x, normalizedCoords.y, 16);

    try {
      const resourceVein = await findNearbyResourceInDatabase(
        normalizedCoords.x,
        normalizedCoords.y,
        searchRadius,
        player.worldId,
        16,
      );

      const scanResult: ScanResult = {
        success: true,
        playerId,
        coordinates: {
          worldX: normalizedCoords.x,
          worldY: normalizedCoords.y,
          chunkX: fullCoords.chunkX,
          chunkY: fullCoords.chunkY,
          cellX: fullCoords.cellX,
          cellY: fullCoords.cellY,
        },
        scanLevel: ScanLevelEnum.SURFACE,
        timestamp: new Date().toISOString(),
      };

      try {
        await db.insert(playerScans).values({
          sessionId: player.sessionId,
          scanCenter: sql`ST_SetSRID(ST_MakePoint(${normalizedCoords.x}, ${normalizedCoords.y}), 4326)`,
          scanArea: sql`ST_Buffer(ST_SetSRID(ST_MakePoint(${normalizedCoords.x}, ${normalizedCoords.y}), 4326), ${searchRadius})`,
          scanType: 'resource',
          results: {
            success: true,
            resourceFound: !!resourceVein,
            resourceType: resourceVein?.type || null,
            scanLevel: ScanLevelEnum.SURFACE,
            coordinates: { worldX: normalizedCoords.x, worldY: normalizedCoords.y },
            searchRadius,
          },
        });
      } catch (dbError) {
        console.warn('Failed to save scan to database:', dbError);
      }
      if (resourceVein) {
        const discoveredVein: ResourceVein = {
          ...resourceVein,
          discovery: {
            ...resourceVein.discovery,
            isDiscovered: true,
            discoveredAt: new Date().toISOString(),
            scanLevel: ScanLevelEnum.SURFACE,
            confidence: 0.7,
            discoveredBy: playerId,
          },
        };

        scanResult.discovered = discoveredVein;

        const isExactMatch =
          resourceVein.location.worldX === normalizedCoords.x &&
          resourceVein.location.worldY === normalizedCoords.y;

        const distance = calculateDistance(
          { x: resourceVein.location.worldX, y: resourceVein.location.worldY },
          normalizedCoords,
        );

        if (isExactMatch) {
          scanResult.message = `Resource vein discovered: ${discoveredVein.type} (Grade: ${discoveredVein.quality.grade})`;
        } else {
          scanResult.message = `Resource vein detected nearby: ${discoveredVein.type} (Grade: ${discoveredVein.quality.grade}) - ${distance.toFixed(1)} units away`;
        }
      } else {
        scanResult.message = `No resources found within ${searchRadius} units of this location`;
      }

      return scanResult;
    } catch (error) {
      console.error('Error during scan operation:', error);

      const errorResult: ScanResult = {
        success: false,
        playerId,
        coordinates: {
          worldX: normalizedCoords?.x || worldX,
          worldY: normalizedCoords?.y || worldY,
          chunkX: fullCoords?.chunkX || Math.floor(worldX / 16),
          chunkY: fullCoords?.chunkY || Math.floor(worldY / 16),
          cellX: fullCoords?.cellX || ((worldX % 16) + 16) % 16,
          cellY: fullCoords?.cellY || ((worldY % 16) + 16) % 16,
        },
        scanLevel: ScanLevelEnum.SURFACE,
        timestamp: new Date().toISOString(),
        message: 'Scan operation failed due to technical difficulties',
      };

      return errorResult;
    }
  },
);
