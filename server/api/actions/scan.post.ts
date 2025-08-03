import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateChunkResources } from '~~/server/utils/resource-generator';
import type { ResourceVein, ScanLevel } from '#shared/types/world';
import { ScanLevel as ScanLevelEnum } from '#shared/types/world';

const scanBodySchema = z.object({
  x: z.number().min(-1000000).max(1000000),
  y: z.number().min(-1000000).max(1000000),
  searchRadius: z.number().min(0).max(5).optional().default(2),
});

interface ScanResult {
  success: boolean;
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

function findNearbyResource(
  targetX: number,
  targetY: number,
  radius: number,
  chunkSize: number,
): ResourceVein | null {
  const coordsToCheck: Array<{ x: number; y: number; distance: number }> = [];

  coordsToCheck.push({ x: targetX, y: targetY, distance: 0 });

  // Generate coordinates in expanding rings around the target
  for (let r = 1; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        // Skip if not on the edge of the current ring
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

        const x = Math.round(targetX + dx);
        const y = Math.round(targetY + dy);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          coordsToCheck.push({ x, y, distance });
        }
      }
    }
  }

  coordsToCheck.sort((a, b) => a.distance - b.distance);

  for (const coord of coordsToCheck) {
    const chunkX = Math.floor(coord.x / chunkSize);
    const chunkY = Math.floor(coord.y / chunkSize);

    try {
      const chunkResources = generateChunkResources(chunkX, chunkY, chunkSize);
      const resourceVein = chunkResources.find(
        (vein: ResourceVein) =>
          vein.location.worldX === coord.x && vein.location.worldY === coord.y,
      );

      if (resourceVein) {
        return resourceVein;
      }
    } catch (error) {
      // Continue searching if this chunk fails
      console.warn(`Failed to generate chunk (${chunkX}, ${chunkY}):`, error);
    }
  }

  return null;
}

/**
 * POST /api/actions/scan
 *
 * Scans a specific world coordinate for resource veins.
 * This is the primary discovery action for players.
 */
export default defineValidatedEventHandler(
  {
    body: scanBodySchema,
  },
  async (event): Promise<ScanResult> => {
    const { x: worldX, y: worldY, searchRadius } = event.context.validated.body;

    const chunkSize = 16;
    const chunkX = Math.floor(worldX / chunkSize);
    const chunkY = Math.floor(worldY / chunkSize);

    const cellX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const cellY = ((worldY % chunkSize) + chunkSize) % chunkSize;

    try {
      const resourceVein = findNearbyResource(worldX, worldY, searchRadius, chunkSize);

      const scanResult: ScanResult = {
        success: true,
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

      if (resourceVein) {
        const discoveredVein: ResourceVein = {
          ...resourceVein,
          discovery: {
            ...resourceVein.discovery,
            isDiscovered: true,
            discoveredAt: new Date().toISOString(),
            scanLevel: ScanLevelEnum.SURFACE,
            confidence: 0.7,
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
