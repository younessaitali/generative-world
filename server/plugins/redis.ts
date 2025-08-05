import { getCacheService, closeCacheService } from '../services/CacheService';

export default defineNitroPlugin(async (nitro) => {
  getCacheService();
  console.log('🚀 Redis cache service initialized');

  // Handle graceful shutdown
  nitro.hooks.hook('close', async () => {
    console.log('🔌 Shutting down Redis cache service...');
    await closeCacheService();
  });
});
