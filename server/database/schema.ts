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
  unique,
  geometry,
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

export const worldChunks = pgTable(
  'world_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    chunkX: real('chunk_x').notNull(),
    chunkY: real('chunk_y').notNull(),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('world_chunk_coords_unique').on(table.worldId, table.chunkX, table.chunkY),
    index('world_chunks_world_id_idx').on(table.worldId),
    index('world_chunks_coords_idx').on(table.chunkX, table.chunkY),
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
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').notNull(),
    centerX: real('center_x').notNull(),
    centerY: real('center_y').notNull(),
    radius: real('radius').notNull(),
    centerPoint: geometry('center_point', {
      type: 'point',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    extractionArea: geometry('extraction_area', {
      type: 'polygon',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    density: real('density').notNull(),
    quality: real('quality').notNull(),
    depth: real('depth'),
    isExhausted: boolean('is_exhausted').notNull().default(false),
    extractedAmount: real('extracted_amount').notNull().default(0),
    discoveredAt: timestamp('discovered_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('resource_veins_world_id_idx').on(table.worldId),
    index('resource_veins_type_idx').on(table.resourceType),
    index('resource_veins_location_idx').on(table.centerX, table.centerY),
    index('resource_veins_center_spatial_idx').using('gist', table.centerPoint),
    index('resource_veins_area_spatial_idx').using('gist', table.extractionArea),
  ],
);

export const playerScans = pgTable(
  'player_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    scanCenter: geometry('scan_center', {
      type: 'point',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    scanArea: geometry('scan_area', {
      type: 'polygon',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    scanType: scanTypeEnum('scan_type').notNull(),
    results: jsonb('results').notNull(),
    scannedAt: timestamp('scanned_at').notNull().defaultNow(),
  },
  (table) => [
    index('player_scans_session_time_idx').on(table.sessionId, table.scannedAt),
    index('player_scans_center_spatial_idx').using('gist', table.scanCenter),
    index('player_scans_area_spatial_idx').using('gist', table.scanArea),
  ],
);

export const resourceClaims = pgTable(
  'resource_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    resourceVeinId: uuid('resource_vein_id')
      .notNull()
      .references(() => resourceVeins.id, { onDelete: 'cascade' }),
    claimedAt: timestamp('claimed_at').notNull().defaultNow(),
    lastActivity: timestamp('last_activity').notNull().defaultNow(),
    claimType: text('claim_type', { enum: ['active', 'reserved'] })
      .notNull()
      .default('active'),
  },
  (table) => [
    unique().on(table.resourceVeinId), // Only one claim per vein
    index('resource_claims_player_idx').on(table.playerId),
    index('resource_claims_vein_idx').on(table.resourceVeinId),
    index('resource_claims_activity_idx').on(table.lastActivity),
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

export const extractors = pgTable(
  'extractors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    x: real('x').notNull(),
    y: real('y').notNull(),
    position: geometry('position', {
      type: 'polygon',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    resourceType: text('resource_type').notNull(),
    status: text('status').notNull().default('IDLE'),
    efficiency: real('efficiency').notNull().default(1.0),
    lastTick: timestamp('last_tick').notNull().defaultNow(),
    storage: jsonb('storage').notNull().default('{}'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('extractors_player_id_idx').on(table.playerId),
    index('extractors_world_id_idx').on(table.worldId),
    index('extractors_resource_type_idx').on(table.resourceType),
    index('extractors_location_idx').on(table.x, table.y),
    index('extractors_position_spatial_idx').using('gist', table.position),
    unique().on(table.x, table.y, table.worldId),
  ],
);

export const extractorsRelations = relations(extractors, ({ one }) => ({
  player: one(players, {
    fields: [extractors.playerId],
    references: [players.id],
  }),
  world: one(worlds, {
    fields: [extractors.worldId],
    references: [worlds.id],
  }),
}));

export const worldsRelations = relations(worlds, ({ many }) => ({
  players: many(players),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  world: one(worlds, {
    fields: [players.worldId],
    references: [worlds.id],
  }),
  playerScans: many(playerScans),
  extractors: many(extractors),
  resourceClaims: many(resourceClaims),
}));

export const resourceVeinsRelations = relations(resourceVeins, ({ one, many }) => ({
  resourceClaim: one(resourceClaims),
}));

export const resourceClaimsRelations = relations(resourceClaims, ({ one }) => ({
  player: one(players, {
    fields: [resourceClaims.playerId],
    references: [players.id],
  }),
  resourceVein: one(resourceVeins, {
    fields: [resourceClaims.resourceVeinId],
    references: [resourceVeins.id],
  }),
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
  sessionId: z.string().min(1),
  scanType: z.enum(['resource', 'geological', 'full']),
  results: z.record(z.string(), z.any()),
});

export const selectPlayerScanSchema = createSelectSchema(playerScans);

export const insertWorldEventSchema = createInsertSchema(worldEvents, {
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectWorldEventSchema = createSelectSchema(worldEvents);

export const insertExtractorSchema = createInsertSchema(extractors, {
  playerId: z.string().uuid(),
  worldId: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  resourceType: z.string(),
  status: z.string().default('IDLE'),
  efficiency: z.number().default(1.0),
  lastTick: z.date().default(new Date()),
  storage: z.record(z.string(), z.any()).default({}),
});

export const selectExtractorSchema = createSelectSchema(extractors);

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

export type Extractor = z.infer<typeof selectExtractorSchema>;
export type NewExtractor = z.infer<typeof insertExtractorSchema>;
