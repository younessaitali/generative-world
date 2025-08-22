import { z } from 'zod/v4';
import { createError } from 'h3';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { ensureChunksHavePersistedVeins } from '~~/server/utils/resource-generator';
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
  const chunksToCheck: Array<{ chunkX: number; chunkY: number }> = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const checkX = targetX + dx;
      const checkY = targetY + dy;
      const chunkX = Math.floor(checkX / chunkSize);
      const chunkY = Math.floor(checkY / chunkSize);

      // Add unique chunks
      if (!chunksToCheck.some((c) => c.chunkX === chunkX && c.chunkY === chunkY)) {
        chunksToCheck.push({ chunkX, chunkY });
      }
    }
  }

  await ensureChunksHavePersistedVeins(chunksToCheck, worldId, chunkSize);

  const queryPoint = sql`ST_SetSRID(ST_MakePoint(${targetX}, ${targetY}), 4326)`;

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

  return {
    id: vein.id as string,
    type: vein.resourceType as ResourceType,
    location: {
      worldX: vein.centerX,
      worldY: vein.centerY,
      chunkX: Math.floor(vein.centerX / chunkSize),
      chunkY: Math.floor(vein.centerY / chunkSize),
      cellX: vein.centerX % chunkSize,
      cellY: vein.centerY % chunkSize,
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
      seed: Math.floor(vein.centerX * 1000 + vein.centerY),
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

    const chunkSize = 16;
    const chunkX = Math.floor(worldX / chunkSize);
    const chunkY = Math.floor(worldY / chunkSize);

    const cellX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const cellY = ((worldY % chunkSize) + chunkSize) % chunkSize;

    try {
      const resourceVein = await findNearbyResourceInDatabase(
        worldX,
        worldY,
        searchRadius,
        player.worldId,
        chunkSize,
      );

      const scanResult: ScanResult = {
        success: true,
        playerId,
        coordinates: {
          worldX,
          worldY,
          chunkX,
          chunkY,
          cellX,
          cellY,
        },
        scanLevel: ScanLevelEnum.SURFACE,
        timestamp: new Date().toISOString(),
      };

      try {
        await db.insert(playerScans).values({
          sessionId: player.sessionId,
          scanCenter: sql`ST_SetSRID(ST_MakePoint(${worldX}, ${worldY}), 4326)`,
          scanArea: sql`ST_Buffer(ST_SetSRID(ST_MakePoint(${worldX}, ${worldY}), 4326), ${searchRadius})`,
          scanType: 'resource',
          results: {
            success: true,
            resourceFound: !!resourceVein,
            resourceType: resourceVein?.type || null,
            scanLevel: ScanLevelEnum.SURFACE,
            coordinates: { worldX, worldY },
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

        // Check if the resource was found at exact coordinates or nearby
        const isExactMatch =
          resourceVein.location.worldX === worldX && resourceVein.location.worldY === worldY;

        const dx = Math.pow(resourceVein.location.worldX - worldX, 2);
        const dy = Math.pow(resourceVein.location.worldY - worldY, 2);
        const distance = Math.sqrt(dx + dy);

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
          worldX,
          worldY,
          chunkX,
          chunkY,
          cellX,
          cellY,
        },
        scanLevel: ScanLevelEnum.SURFACE,
        timestamp: new Date().toISOString(),
        message: 'Scan operation failed due to technical difficulties',
      };

      return errorResult;
    }
  },
);
