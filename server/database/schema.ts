import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const scanTypeEnum = pgEnum('scan_type', ['resource', 'geological', 'full']);

export const worldChunks = pgTable(
  'world_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chunkX: integer('chunk_x').notNull(),
    chunkY: integer('chunk_y').notNull(),
    biomeData: jsonb('biome_data').notNull(),
    elevationData: jsonb('elevation_data').notNull(),
    resourceData: jsonb('resource_data'),
    terrainData: jsonb('terrain_data'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('chunk_coordinates_idx').on(table.chunkX, table.chunkY),
    index('updated_at_idx').on(table.updatedAt),
  ],
);

export const resourceVeins = pgTable(
  'resource_veins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => worldChunks.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').notNull(),
    centerX: real('center_x').notNull(),
    centerY: real('center_y').notNull(),
    radius: real('radius').notNull(),
    density: real('density').notNull(),
    quality: real('quality').notNull(),
    depth: real('depth'),
    isExhausted: boolean('is_exhausted').notNull().default(false),
    extractedAmount: real('extracted_amount').notNull().default(0),
    discoveredAt: timestamp('discovered_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('resource_veins_chunk_id_idx').on(table.chunkId),
    index('resource_veins_type_idx').on(table.resourceType),
    index('resource_veins_location_idx').on(table.centerX, table.centerY),
  ],
);

export const playerScans = pgTable(
  'player_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => worldChunks.id, { onDelete: 'cascade' }),
    scanX: real('scan_x').notNull(),
    scanY: real('scan_y').notNull(),
    scanRadius: real('scan_radius').notNull(),
    scanType: scanTypeEnum('scan_type').notNull(),
    results: jsonb('results').notNull(),
    scannedAt: timestamp('scanned_at').notNull().defaultNow(),
  },
  (table) => [
    index('player_scans_session_time_idx').on(table.sessionId, table.scannedAt),
    index('player_scans_chunk_idx').on(table.chunkId),
  ],
);

export const worldEvents = pgTable(
  'world_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    chunkId: uuid('chunk_id').references(() => worldChunks.id),
    eventData: jsonb('event_data').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('world_events_type_idx').on(table.eventType),
    index('world_events_chunk_idx').on(table.chunkId),
    index('world_events_time_idx').on(table.createdAt),
  ],
);

export const worldChunksRelations = relations(worldChunks, ({ many }) => ({
  resourceVeins: many(resourceVeins),
  playerScans: many(playerScans),
  worldEvents: many(worldEvents),
}));

export const resourceVeinsRelations = relations(resourceVeins, ({ one }) => ({
  chunk: one(worldChunks, {
    fields: [resourceVeins.chunkId],
    references: [worldChunks.id],
  }),
}));

export const playerScansRelations = relations(playerScans, ({ one }) => ({
  chunk: one(worldChunks, {
    fields: [playerScans.chunkId],
    references: [worldChunks.id],
  }),
}));

export const worldEventsRelations = relations(worldEvents, ({ one }) => ({
  chunk: one(worldChunks, {
    fields: [worldEvents.chunkId],
    references: [worldChunks.id],
  }),
}));

// Zod Schemas for validation
const terrainDataSchema = z.array(z.any());

export const insertWorldChunkSchema = createInsertSchema(worldChunks, {
  chunkX: z.number().int(),
  chunkY: z.number().int(),
  biomeData: terrainDataSchema,
  elevationData: terrainDataSchema,
  resourceData: z.array(z.any()).optional(),
  terrainData: z.array(z.any()).optional(),
});

export const selectWorldChunkSchema = createSelectSchema(worldChunks);

export const insertResourceVeinSchema = createInsertSchema(resourceVeins, {
  centerX: z.number(),
  centerY: z.number(),
  radius: z.number().positive(),
  density: z.number().min(0).max(1),
  quality: z.number().min(0).max(1),
  depth: z.number().positive().optional(),
  extractedAmount: z.number().min(0).default(0),
});

export const selectResourceVeinSchema = createSelectSchema(resourceVeins);

export const insertPlayerScanSchema = createInsertSchema(playerScans, {
  scanX: z.number(),
  scanY: z.number(),
  scanRadius: z.number().positive(),
  results: z.record(z.string(), z.any()),
});

export const selectPlayerScanSchema = createSelectSchema(playerScans);

export const insertWorldEventSchema = createInsertSchema(worldEvents, {
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectWorldEventSchema = createSelectSchema(worldEvents);

// Export types
export type WorldChunk = z.infer<typeof selectWorldChunkSchema>;
export type NewWorldChunk = z.infer<typeof insertWorldChunkSchema>;
export type ResourceVein = z.infer<typeof selectResourceVeinSchema>;
export type NewResourceVein = z.infer<typeof insertResourceVeinSchema>;
export type PlayerScan = z.infer<typeof selectPlayerScanSchema>;
export type NewPlayerScan = z.infer<typeof insertPlayerScanSchema>;
export type WorldEvent = z.infer<typeof selectWorldEventSchema>;
export type NewWorldEvent = z.infer<typeof insertWorldEventSchema>;
