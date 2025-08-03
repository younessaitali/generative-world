import { db } from '../database/connection';
import {
  worldChunks,
  resourceVeins,
  playerScans,
  worldEvents,
  type WorldChunk,
  type NewWorldChunk,
  type ResourceVein as DbResourceVein,
  type NewResourceVein,
  type PlayerScan,
  type NewPlayerScan,
  type WorldEvent,
  type NewWorldEvent,
  insertPlayerScanSchema,
  insertWorldEventSchema,
} from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ChunkData, ResourceVein } from '#shared/types/world';

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private get database() {
    return db;
  }

  // Chunk operations
  async getChunk(chunkX: number, chunkY: number): Promise<WorldChunk | null> {
    const result = await this.database
      .select()
      .from(worldChunks)
      .where(and(eq(worldChunks.chunkX, chunkX), eq(worldChunks.chunkY, chunkY)))
      .limit(1);

    return result[0] || null;
  }

  async saveChunk(chunkData: ChunkData): Promise<WorldChunk> {
    const { chunkX, chunkY } = chunkData.coordinate;

    const chunkInput: NewWorldChunk = {
      chunkX,
      chunkY,
      biomeData: chunkData.climateData || [],
      elevationData: chunkData.elevationData || [],
      resourceData: chunkData.resources || [],
      terrainData: chunkData.terrain || [],
    };

    const result = await this.database
      .insert(worldChunks)
      .values(chunkInput)
      .onConflictDoUpdate({
        target: [worldChunks.chunkX, worldChunks.chunkY],
        set: {
          ...chunkInput,
          version: sql`${worldChunks.version} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }

  async getResourceVeins(chunkId: string): Promise<DbResourceVein[]> {
    return await this.database
      .select()
      .from(resourceVeins)
      .where(eq(resourceVeins.chunkId, chunkId));
  }

  async saveResourceVein(vein: ResourceVein, chunkId: string): Promise<DbResourceVein> {
    const veinData: NewResourceVein = {
      chunkId,
      resourceType: vein.type,
      centerX: vein.location.worldX,
      centerY: vein.location.worldY,
      radius: vein.deposit.size,
      density: vein.deposit.richness,
      quality: vein.quality.purity,
      depth: vein.deposit.depth,
      isExhausted: vein.extraction.depletion >= 1,
      extractedAmount: vein.extraction.totalExtracted,
      discoveredAt: vein.discovery.discoveredAt ? new Date(vein.discovery.discoveredAt) : null,
    };

    const result = await this.database.insert(resourceVeins).values(veinData).returning();

    return result[0];
  }

  async saveScanResult(scanData: {
    sessionId: string;
    chunkId: string;
    scanX: number;
    scanY: number;
    scanRadius: number;
    scanType: 'resource' | 'geological' | 'full';
    results: Record<string, unknown>;
  }): Promise<PlayerScan> {
    const validatedScan: NewPlayerScan = insertPlayerScanSchema.parse(scanData);
    const result = await this.database.insert(playerScans).values(validatedScan).returning();

    return result[0];
  }

  async getPlayerScans(sessionId: string): Promise<PlayerScan[]> {
    return await this.database
      .select()
      .from(playerScans)
      .where(eq(playerScans.sessionId, sessionId))
      .orderBy(playerScans.scannedAt);
  }

  // Event operations
  async recordEvent(eventData: {
    eventType: string;
    chunkId?: string;
    eventData: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<WorldEvent> {
    const validatedEvent: NewWorldEvent = insertWorldEventSchema.parse(eventData);
    const result = await this.database.insert(worldEvents).values(validatedEvent).returning();

    return result[0];
  }
}
