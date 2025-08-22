import { getCacheService, closeCacheService } from '../services/CacheService';
import { logger } from '#shared/utils/logger';

export default defineNitroPlugin(async (nitro) => {
  getCacheService();
  logger.info('Redis cache service initialized', { context: 'redis-plugin' });

  // Handle graceful shutdown
  nitro.hooks.hook('close', async () => {
    logger.info('Shutting down Redis cache service...', { context: 'redis-plugin' });
    await closeCacheService();
  });
});
