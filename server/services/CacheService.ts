import Redis from 'ioredis';
import type { ChunkData } from '#shared/types/world';

export class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private connectionAttempted = false;

  constructor() {
    this.initializeRedis();
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
        console.log('🔗 Redis cache connected');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis cache ready');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis cache error:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis cache connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis cache reconnecting...');
      });

      await this.redis.connect();
    } catch (error) {
      console.warn('⚠️ Redis cache not available, proceeding without caching:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  async getChunk(worldId: string, x: number, y: number): Promise<ChunkData | null> {
    if (!this.redis || !this.isConnected) {
      console.log(`📦 Cache MISS (no connection): chunks:${worldId}:${x}:${y}`);
      return null;
    }

    try {
      const key = `chunks:${worldId}:${x}:${y}`;
      const start = Date.now();

      const cachedData = await this.redis.get(key);

      const duration = Date.now() - start;

      if (cachedData) {
        console.log(`🎯 Cache HIT (${duration}ms): chunks:${worldId}:${x}:${y}`);
        return JSON.parse(cachedData);
      }

      console.log(`📦 Cache MISS (${duration}ms): chunks:${worldId}:${x}:${y}`);
      return null;
    } catch (error) {
      console.error('❌ Error reading from Redis cache:', error);
      return null;
    }
  }

  async setChunk(worldId: string, x: number, y: number, data: ChunkData): Promise<void> {
    if (!this.redis || !this.isConnected) {
      console.log(`💾 Cache SKIP (no connection): chunks:${worldId}:${x}:${y}`);
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

      console.log(`💾 Cache SET (${duration}ms, ${sizeKB}KB): chunks:${worldId}:${x}:${y}`);
    } catch (error) {
      console.error('❌ Error writing to Redis cache:', error);
    }
  }

  async deleteChunk(worldId: string, x: number, y: number): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const key = `chunks:${worldId}:${x}:${y}`;
      await this.redis.del(key);
      console.log(`🗑️ Cache DELETE: chunks:${worldId}:${x}:${y}`);
    } catch (error) {
      console.error('❌ Error deleting from Redis cache:', error);
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
        console.log(`🧹 Cache CLEAR: Removed ${keys.length} chunks for world ${worldId}`);
      }
    } catch (error) {
      console.error('❌ Error clearing world cache:', error);
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
      console.error('❌ Error getting cache stats:', error);
      return { connected: false, keyCount: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Redis cache connection closed gracefully');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
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
    cacheService = new CacheService();
  }
  return cacheService;
}

export async function closeCacheService(): Promise<void> {
  if (cacheService) {
    await cacheService.close();
    cacheService = null;
  }
}
