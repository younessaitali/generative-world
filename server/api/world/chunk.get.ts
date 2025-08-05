import { z } from 'zod/v4';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateOrLoadChunk } from '~~/server/utils/resource-generator';

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
    const worldId = 'default';

    const chunkData = await generateOrLoadChunk(x, y, chunkSize, worldId);

    return {
      success: true,
      terrain: chunkData.terrain,
      coordinates: { x, y },
      chunkSize: chunkData.size,
      resources: chunkData.resources,
      metadata: {
        ...chunkData.metadata,
        generationTime: Date.now(),
        cached: chunkData.metadata?.generationMethod?.includes('cache'),
        dataSource: chunkData.metadata?.generationMethod || 'unknown',
      },
      timestamp: chunkData.timestamp,
    };
  },
);
