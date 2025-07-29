import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateChunkResources } from '~~/server/utils/resource-generator';
import type { ResourceVein, ScanLevel } from '~/types/world';
import { ScanLevel as ScanLevelEnum } from '~/types/world';

const scanBodySchema = z.object({
  x: z.number().int().min(-1000000).max(1000000),
  y: z.number().int().min(-1000000).max(1000000),
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
    const { x: worldX, y: worldY } = event.context.validated.body;

    const chunkSize = 16;
    const chunkX = Math.floor(worldX / chunkSize);
    const chunkY = Math.floor(worldY / chunkSize);

    const cellX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const cellY = ((worldY % chunkSize) + chunkSize) % chunkSize;

    try {
      const chunkResources = generateChunkResources(chunkX, chunkY, chunkSize);

      const resourceVein = chunkResources.find(
        (vein: ResourceVein) => vein.location.worldX === worldX && vein.location.worldY === worldY,
      );

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
        scanResult.message = `Resource vein discovered: ${discoveredVein.type} (Grade: ${discoveredVein.quality.grade})`;
      } else {
        scanResult.message = 'No resources found at this location';
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
