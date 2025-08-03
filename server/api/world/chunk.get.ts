import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateChunkResources } from '~~/server/utils/resource-generator';
import { generateChunkTerrain } from '~~/server/utils/terrain-generator';

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

    const terrainData = generateChunkTerrain(x, y, chunkSize);

    const resources = generateChunkResources(x, y, chunkSize);

    return {
      success: true,
      terrain: terrainData,
      coordinates: { x, y },
      chunkSize,
      resources,
      metadata: {
        version: '3.0.0',
        generationMethod: 'multi_layer_noise',
        generationTime: Date.now(),
      },
      timestamp: new Date().toISOString(),
    };
  },
);
