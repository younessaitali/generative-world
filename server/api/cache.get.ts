import { getRedisClient } from '~~/server/utils/redis';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const action = url.searchParams.get('action');

  try {
    const client = await getRedisClient();

    switch (action) {
      case 'stats': {
        if (!client) {
          return { error: 'Redis not available' };
        }

        const keys = await client.keys('chunk:*');
        const info = await client.info('memory');

        return {
          success: true,
          cachedChunks: keys.length,
          chunkKeys: keys.slice(0, 10), // Show first 10 keys
          redisMemoryInfo: info
            .split('\n')
            .filter(
              (line) => line.includes('used_memory_human') || line.includes('used_memory_dataset'),
            ),
        };
      }

      case 'clear': {
        if (!client) {
          return { error: 'Redis not available' };
        }

        const keys = await client.keys('chunk:*');
        if (keys.length > 0) {
          await client.del(keys);
        }

        return {
          success: true,
          message: `Cleared ${keys.length} cached chunks`,
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
