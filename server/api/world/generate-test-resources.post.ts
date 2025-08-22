import { z } from 'zod';
import { eq } from 'drizzle-orm';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { generateAndPersistChunkResources } from '~~/server/utils/resource-generator';
import { db } from '~~/server/database/connection';
import { worlds } from '~~/server/database/schema';

const generateTestResourcesSchema = z.object({
  chunkX: z.number().int().default(0),
  chunkY: z.number().int().default(0),
  chunkSize: z.number().int().min(1).max(64).default(16),
});

export default defineValidatedEventHandler({ body: generateTestResourcesSchema }, async (event) => {
  const { chunkX, chunkY, chunkSize } = event.context.validated.body;

  try {
    let world = await db.select().from(worlds).where(eq(worlds.name, 'test-world')).limit(1);

    if (world.length === 0) {
      world = await db
        .insert(worlds)
        .values({
          name: 'test-world',
          seed: 'test-seed-123',
          description: 'Test world for resource generation',
          isActive: true,
        })
        .returning();
    }

    const worldId = world[0].id;
    const resources = await generateAndPersistChunkResources(chunkX, chunkY, chunkSize, worldId);

    return {
      success: true,
      message: `Generated ${resources.length} resource veins for chunk (${chunkX}, ${chunkY}) in world ${worldId}`,
      chunk: { chunkX, chunkY, chunkSize },
      worldId,
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
