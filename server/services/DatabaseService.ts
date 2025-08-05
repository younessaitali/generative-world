import { db, executeQuery } from '../database/connection';
import {
  resourceVeins,
  playerScans,
  worldEvents,
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
import type { ResourceVein } from '#shared/types/world';

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

  async getResourceVeins(centerX?: number, centerY?: number, radius?: number): Promise<DbResourceVein[]> {
    return executeQuery(async () => {
      if (centerX !== undefined && centerY !== undefined && radius !== undefined) {
        return await this.database
          .select()
          .from(resourceVeins)
          .where(
            and(
              sql`abs(${resourceVeins.centerX} - ${centerX}) < ${radius}`,
              sql`abs(${resourceVeins.centerY} - ${centerY}) < ${radius}`
            )
          );
      } else {
        // Return all resource veins
        return await this.database.select().from(resourceVeins);
      }
    }, `get resource veins`);
  }

  async saveResourceVein(vein: ResourceVein): Promise<DbResourceVein> {
    return executeQuery(async () => {
      const veinData: NewResourceVein = {
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
    }, `save resource vein ${vein.type}`);
  }

  async saveScanResult(scanData: {
    sessionId: string;
    scanX: number;
    scanY: number;
    scanRadius: number;
    scanType: 'resource' | 'geological' | 'full';
    results: Record<string, unknown>;
  }): Promise<PlayerScan> {
    return executeQuery(async () => {
      const validatedScan: NewPlayerScan = insertPlayerScanSchema.parse(scanData);
      const result = await this.database.insert(playerScans).values(validatedScan).returning();

      return result[0];
    }, `save scan result for session ${scanData.sessionId}`);
  }

  async getPlayerScans(sessionId: string): Promise<PlayerScan[]> {
    return executeQuery(async () => {
      return await this.database
        .select()
        .from(playerScans)
        .where(eq(playerScans.sessionId, sessionId))
        .orderBy(playerScans.scannedAt);
    }, `get player scans for session ${sessionId}`);
  }

  // Event operations
  async recordEvent(eventData: {
    eventType: string;
    eventData: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<WorldEvent> {
    return executeQuery(async () => {
      const validatedEvent: NewWorldEvent = insertWorldEventSchema.parse(eventData);
      const result = await this.database.insert(worldEvents).values(validatedEvent).returning();

      return result[0];
    }, `record event ${eventData.eventType}`);
  }

  // Performance monitoring methods
  async getConnectionHealth(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  }> {
    // todo implement connection health check
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
    };
  }
}
