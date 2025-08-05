import { getCacheService } from '../services/CacheService';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const action = url.searchParams.get('action');

  try {
    const cacheService = getCacheService();

    switch (action) {
      case 'stats': {
        if (!cacheService.isAvailable()) {
          return { error: 'Redis not available' };
        }

        const stats = await cacheService.getCacheStats();

        return {
          success: true,
          cachedChunks: stats.keyCount,
          stats,
        };
      }

      case 'clear': {
        if (!cacheService.isAvailable()) {
          return { error: 'Redis not available' };
        }

        await cacheService.clearWorld('default');

        return {
          success: true,
          message: 'Cleared cached chunks for default world',
        };
      }

      default:
        return {
          success: true,
          message: 'Redis Cache API',
          availableActions: ['stats', 'clear'],
          examples: [
            '/api/cache?action=stats - View cache statistics',
            '/api/cache?action=clear - Clear all cached chunks',
          ],
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
