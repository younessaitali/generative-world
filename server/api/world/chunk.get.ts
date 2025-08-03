import { createNoise2D } from 'simplex-noise';
import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateChunkResources } from '~~/server/utils/resource-generator';
import { ExtendedTerrainType } from '~/types/world';

const noise2D = createNoise2D();

const querySchema = z.object({
  x: z.coerce.number().int().default(0),
  y: z.coerce.number().int().default(0),
});

export default defineValidatedEventHandler(
  {
    query: querySchema,
  },
  async (event) => {
    const { x, y } = event.context.validated.query;

    const chunkSize = 16;
    const terrainData: ExtendedTerrainType[][] = [];

    const noiseScale = 0.02;
    const moistureScale = 0.015;
    const temperatureScale = 0.01;

    for (let row = 0; row < chunkSize; row++) {
      const rowData: ExtendedTerrainType[] = [];

      for (let col = 0; col < chunkSize; col++) {
        const worldX = x * chunkSize + col;
        const worldY = y * chunkSize + row;

        const terrainNoise = noise2D(worldX * noiseScale, worldY * noiseScale);
        const moistureNoise = noise2D(worldX * moistureScale + 1000, worldY * moistureScale + 1000);
        const temperatureNoise = noise2D(
          worldX * temperatureScale + 2000,
          worldY * temperatureScale + 2000,
        );

        let terrainType: ExtendedTerrainType;

        if (terrainNoise < -0.5) {
          terrainType = ExtendedTerrainType.OCEAN;
        } else if (terrainNoise < -0.2) {
          if (moistureNoise > 0.3) {
            terrainType = ExtendedTerrainType.SWAMP;
          } else {
            terrainType = ExtendedTerrainType.PLAINS;
          }
        } else if (terrainNoise < 0.1) {
          if (moistureNoise > 0.2) {
            terrainType = ExtendedTerrainType.FOREST;
          } else {
            terrainType = ExtendedTerrainType.HILLS;
          }
        } else if (terrainNoise < 0.4) {
          if (temperatureNoise < -0.3) {
            terrainType = ExtendedTerrainType.TUNDRA;
          } else {
            terrainType = ExtendedTerrainType.MOUNTAINS;
          }
        } else if (moistureNoise < -0.2 || temperatureNoise > 0.4) {
          terrainType = ExtendedTerrainType.DESERT;
        } else {
          terrainType = ExtendedTerrainType.FOREST;
        }

        rowData.push(terrainType);
      }

      terrainData.push(rowData);
    }

    const resources = generateChunkResources(x, y, chunkSize);

    return {
      success: true,
      terrain: terrainData,
      coordinates: { x, y },
      chunkSize,
      resources,
      metadata: {
        version: '2.0.0',
        generationMethod: 'enhanced_noise',
        generationTime: Date.now(),
      },
      timestamp: new Date().toISOString(),
    };
  },
);
