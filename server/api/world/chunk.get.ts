import { createNoise2D } from 'simplex-noise';
import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';

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
    const chunkData: number[][] = [];

    const noiseScale = 0.1;

    for (let row = 0; row < chunkSize; row++) {
      const rowData: number[] = [];

      for (let col = 0; col < chunkSize; col++) {
        const worldX = x * chunkSize + col;
        const worldY = y * chunkSize + row;

        const noiseValue = noise2D(worldX * noiseScale, worldY * noiseScale);

        const terrainType = noiseValue < 0 ? 0 : 1;

        rowData.push(terrainType);
      }

      chunkData.push(rowData);
    }

    return {
      success: true,
      data: { cells: chunkData },
      resources: [],
      coordinates: { x, y },
      chunkSize,
      timestamp: new Date().toISOString(),
    };
  },
);
