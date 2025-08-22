import { logger } from '#shared/utils/logger';
import { getStorageService } from '~~/server/services/StorageService';

export default defineNitroPlugin(async (nitroApp) => {
  logger.info('Initializing MinIO Storage Service...', { context: 'minio-plugin' });

  try {
    // Initialize storage service singleton
    const storageService = getStorageService();

    // Wait for connection to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (storageService.isAvailable()) {
      logger.info('MinIO Storage Service initialized successfully', { context: 'minio-plugin' });
    } else {
      logger.warn('MinIO Storage Service not available - continuing without cold storage', {
        context: 'minio-plugin',
      });
    }

    nitroApp.hooks.hook('beforeResponse', () => {
      // Todo Attach storage service to the request context
    });
  } catch (error) {
    logger.error('Failed to initialize MinIO Storage Service', {
      context: 'minio-plugin',
      error: (error as Error).message,
    });
    logger.warn('Cold storage will be unavailable - falling back to cache/database only', {
      context: 'minio-plugin',
    });
  }
});
