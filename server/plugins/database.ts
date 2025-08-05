import 'dotenv/config';
import { testConnection, closeConnection, warmUpPool, getPoolStatus } from '../database/connection';
import { dbMonitorService } from '../database/monitor';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔧 Initializing database connection...');

  try {
    // Test connection with retry logic
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error('❌ Failed to establish database connection');
      // Don't throw error to prevent server from crashing
      // The application can still work with degraded functionality
      return;
    }

    // Warm up connection pool for better initial performance
    await warmUpPool();

    console.log('🗄️ Database connection initialized successfully');

    // Log initial pool status
    const status = getPoolStatus();
    console.log('📊 Initial pool status:', {
      total: status.totalConnections,
      idle: status.idleConnections,
      waiting: status.waitingClients,
    });

    const healthCheck = await dbMonitorService.performHealthCheck();
    console.log(`💚 Database health check: ${healthCheck ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.error('❌ Database initialization error:', (error as Error).message);
  }

  // Graceful shutdown handling
  nitroApp.hooks.hook('close', async () => {
    console.log('🔌 Shutting down database connections...');

    try {
      dbMonitorService.stop();

      await closeConnection();

      console.log('✅ Database shutdown completed successfully');
    } catch (error) {
      console.error('❌ Error during database shutdown:', (error as Error).message);
    }
  });

  nitroApp.hooks.hook('error', async (error) => {
    // Log database-related errors
    if (error.message && error.message.toLowerCase().includes('database')) {
      console.error('🚨 Database-related error detected:', error.message);
      dbMonitorService.recordError(error.message);
    }
  });
});
