import { z } from 'zod/v4';
import { createError } from 'h3';
import defineValidatedEventHandler from '~~/server/utils/define-validated-event-handler';
import { db } from '~~/server/database/connection';
import { extractors } from '~~/server/database/schema';
import { and, eq, sql } from 'drizzle-orm';

const querySchema = z.object({
  resourceType: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export default defineValidatedEventHandler(
  {
    query: querySchema,
  },
  async (event) => {
    const player = event.context.player;
    if (!player) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const { resourceType, status, limit, offset } = event.context.validated.query;

    const whereClauses = [
      eq(extractors.playerId, player.id),
      eq(extractors.worldId, player.worldId),
    ];

    if (resourceType) whereClauses.push(eq(extractors.resourceType, resourceType));
    if (status) whereClauses.push(eq(extractors.status, status));

    const rows = await db
      .select({
        id: extractors.id,
        x: extractors.x,
        y: extractors.y,
        resourceType: extractors.resourceType,
        status: extractors.status,
        efficiency: extractors.efficiency,
        createdAt: extractors.createdAt,
      })
      .from(extractors)
      .where(and(...whereClauses))
      .orderBy(sql`${extractors.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(extractors)
      .where(and(...whereClauses));

    return {
      extractors: rows.map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        resourceType: r.resourceType,
        status: r.status,
        efficiency: r.efficiency,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : new Date((r.createdAt as unknown as string) ?? '').toISOString(),
      })),
      count: Number(count ?? rows.length),
    };
  },
);
