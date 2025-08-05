import { getStorageService } from '~~/server/services/StorageService';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🪣 Initializing MinIO Storage Service...');

  try {
    // Initialize storage service singleton
    const storageService = getStorageService();

    // Wait for connection to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (storageService.isAvailable()) {
      console.log('✅ MinIO Storage Service initialized successfully');
    } else {
      console.warn('⚠️ MinIO Storage Service not available - continuing without cold storage');
    }

    nitroApp.hooks.hook('beforeResponse', () => {
      // Todo Attach storage service to the request context
    });
  } catch (error) {
    console.error('❌ Failed to initialize MinIO Storage Service:', error);
    console.warn('⚠️ Cold storage will be unavailable - falling back to cache/database only');
  }
});
