import { z } from 'zod';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateAndPersistChunkResources } from '~~/server/utils/resource-generator';

const generateTestResourcesSchema = z.object({
  chunkX: z.number().int().default(0),
  chunkY: z.number().int().default(0),
  chunkSize: z.number().int().min(1).max(64).default(16),
});

export default defineValidatedEventHandler({ body: generateTestResourcesSchema }, async (event) => {
  const { chunkX, chunkY, chunkSize } = event.context.validated.body;

  try {
    const resources = await generateAndPersistChunkResources(chunkX, chunkY, chunkSize);

    return {
      success: true,
      message: `Generated ${resources.length} resource veins for chunk (${chunkX}, ${chunkY})`,
      chunk: { chunkX, chunkY, chunkSize },
      resourceCount: resources.length,
      resources: resources.map((r) => ({
        id: r.id,
        type: r.type,
        location: r.location,
        deposit: r.deposit,
        quality: r.quality,
      })),
    };
  } catch (error) {
    console.error('Failed to generate test resources:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate test resources',
    });
  }
});
