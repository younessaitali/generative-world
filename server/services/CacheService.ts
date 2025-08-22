import Redis from 'ioredis';
import type { ChunkData } from '#shared/types/world';
import { logger, createServiceLogger } from '#shared/utils/logger';

export class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private connectionAttempted = false;
  private log: ReturnType<typeof createServiceLogger>['info'];
  private warn: ReturnType<typeof createServiceLogger>['warn'];
  private error: ReturnType<typeof createServiceLogger>['error'];

  constructor(options?: { enableLogs?: boolean }) {
    const serviceLogger = createServiceLogger('CacheService');
    this.log = serviceLogger.info;
    this.warn = serviceLogger.warn;
    this.error = serviceLogger.error;

    this.initializeRedis();
  }

  // Allow runtime toggling if needed
  setLogging(enabled: boolean): void {
    logger.setLevel(enabled ? 0 : 2);
  }

  private async initializeRedis(): Promise<void> {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      this.redis.on('connect', () => {
        this.log('Redis cache connected');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        this.log('Redis cache ready');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        this.error('Redis cache error', 'initializeRedis', {
          error: (error as Error).message,
        });
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.log('Redis cache connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        this.log('Redis cache reconnecting...');
      });

      await this.redis.connect();
    } catch (error) {
      this.warn('Redis cache not available, proceeding without caching', 'initializeRedis', {
        error: (error as Error).message,
      });
      this.redis = null;
      this.isConnected = false;
    }
  }

  async getChunk(worldId: string, x: number, y: number): Promise<ChunkData | null> {
    if (!this.redis || !this.isConnected) {
      this.log(`Cache MISS (no connection): chunks:${worldId}:${x}:${y}`);
      return null;
    }

    try {
      const key = `chunks:${worldId}:${x}:${y}`;
      const start = Date.now();

      const cachedData = await this.redis.get(key);

      const duration = Date.now() - start;

      if (cachedData) {
        this.log(`Cache HIT (${duration}ms): chunks:${worldId}:${x}:${y}`);
        return JSON.parse(cachedData);
      }

      this.log(`Cache MISS (${duration}ms): chunks:${worldId}:${x}:${y}`);
      return null;
    } catch (error) {
      this.error('Error reading from Redis cache', 'getChunk', {
        error: (error as Error).message,
      });
      return null;
    }
  }

  async setChunk(worldId: string, x: number, y: number, data: ChunkData): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.log(`Cache SKIP (no connection): chunks:${worldId}:${x}:${y}`);
      return;
    }

    try {
      const key = `chunks:${worldId}:${x}:${y}`;
      const serializedData = JSON.stringify(data);
      const start = Date.now();

      // Cache for 1 hour (3600 seconds) to prevent infinite memory growth
      // In production, this could be longer or use LRU eviction
      await this.redis.setex(key, 3600, serializedData);

      const duration = Date.now() - start;
      const sizeKB = Math.round(serializedData.length / 1024);

      this.log(`Cache SET (${duration}ms, ${sizeKB}KB): chunks:${worldId}:${x}:${y}`);
    } catch (error) {
      this.error('Error writing to Redis cache', 'setChunk', {
        error: (error as Error).message,
      });
    }
  }

  async deleteChunk(worldId: string, x: number, y: number): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const key = `chunks:${worldId}:${x}:${y}`;
      await this.redis.del(key);
      this.log(`Cache DELETE: chunks:${worldId}:${x}:${y}`);
    } catch (error) {
      this.error('Error deleting from Redis cache', 'deleteChunk', {
        error: (error as Error).message,
      });
    }
  }

  async clearWorld(worldId: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const pattern = `chunks:${worldId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.log(`Cache CLEAR: Removed ${keys.length} chunks for world ${worldId}`);
      }
    } catch (error) {
      this.error('Error clearing world cache', 'clearWorld', {
        error: (error as Error).message,
      });
    }
  }

  async getCacheStats(): Promise<{
    connected: boolean;
    keyCount: number;
    usedMemory?: string;
    hitRate?: number;
  }> {
    if (!this.redis || !this.isConnected) {
      return { connected: false, keyCount: 0 };
    }

    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();

      const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : undefined;

      return {
        connected: true,
        keyCount,
        usedMemory,
      };
    } catch (error) {
      this.error('Error getting cache stats', 'getCacheStats', {
        error: (error as Error).message,
      });
      return { connected: false, keyCount: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.log('Redis cache connection closed gracefully');
      } catch (error) {
        this.error('Error closing Redis connection', 'close', {
          error: (error as Error).message,
        });
      } finally {
        this.redis = null;
        this.isConnected = false;
      }
    }
  }

  isAvailable(): boolean {
    return this.redis !== null && this.isConnected;
  }
}

// Global instance
let cacheService: CacheService | null = null;

/**
 * Get the global CacheService instance
 */
export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService({
      enableLogs: false,
    });
  }
  return cacheService;
}

export async function closeCacheService(): Promise<void> {
  if (cacheService) {
    await cacheService.close();
    cacheService = null;
  }
}
