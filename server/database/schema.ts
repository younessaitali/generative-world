import {
  pgTable,
  text,
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

export const worlds = pgTable(
  'worlds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    seed: text('seed').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('worlds_name_idx').on(table.name),
    index('worlds_active_idx').on(table.isActive),
  ],
);

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull().unique(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    name: text('name'),
    inventory: jsonb('inventory').notNull().default('{}'),
    credits: real('credits').notNull().default(1000),
    lastActive: timestamp('last_active').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('players_session_id_idx').on(table.sessionId),
    index('players_last_active_idx').on(table.lastActive),
    index('players_world_id_idx').on(table.worldId),
  ],
);

export const resourceVeins = pgTable(
  'resource_veins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    index('resource_veins_type_idx').on(table.resourceType),
    index('resource_veins_location_idx').on(table.centerX, table.centerY),
  ],
);

export const playerScans = pgTable(
  'player_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    scanX: real('scan_x').notNull(),
    scanY: real('scan_y').notNull(),
    scanRadius: real('scan_radius').notNull(),
    scanType: scanTypeEnum('scan_type').notNull(),
    results: jsonb('results').notNull(),
    scannedAt: timestamp('scanned_at').notNull().defaultNow(),
  },
  (table) => [
    index('player_scans_session_time_idx').on(table.sessionId, table.scannedAt),
  ],
);

export const worldEvents = pgTable(
  'world_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('world_events_type_idx').on(table.eventType),
    index('world_events_time_idx').on(table.createdAt),
  ],
);

export const worldsRelations = relations(worlds, ({ many }) => ({
  players: many(players),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  world: one(worlds, {
    fields: [players.worldId],
    references: [worlds.id],
  }),
  playerScans: many(playerScans),
}));


// Zod Schemas for validation

export const insertWorldSchema = createInsertSchema(worlds, {
  name: z.string().min(1).max(100),
  seed: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const selectWorldSchema = createSelectSchema(worlds);

export const insertPlayerSchema = createInsertSchema(players, {
  sessionId: z.string().min(1),
  worldId: z.uuid(),
  name: z.string().optional(),
  inventory: z.record(z.string(), z.number()).default({}),
  credits: z.number().min(0).default(1000),
});

export const selectPlayerSchema = createSelectSchema(players);

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
export type World = z.infer<typeof selectWorldSchema>;
export type NewWorld = z.infer<typeof insertWorldSchema>;
export type Player = z.infer<typeof selectPlayerSchema>;
export type NewPlayer = z.infer<typeof insertPlayerSchema>;
export type ResourceVein = z.infer<typeof selectResourceVeinSchema>;
export type NewResourceVein = z.infer<typeof insertResourceVeinSchema>;
export type PlayerScan = z.infer<typeof selectPlayerScanSchema>;
export type NewPlayerScan = z.infer<typeof insertPlayerScanSchema>;
export type WorldEvent = z.infer<typeof selectWorldEventSchema>;
export type NewWorldEvent = z.infer<typeof insertWorldEventSchema>;
