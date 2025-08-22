import 'dotenv/config';
import { testConnection, closeConnection, warmUpPool, getPoolStatus } from '../database/connection';
import { dbMonitorService } from '../database/monitor';
import { logger } from '#shared/utils/logger';

export default defineNitroPlugin(async (nitroApp) => {
  logger.info('Initializing database connection...', { context: 'database-plugin' });

  try {
    // Test connection with retry logic
    const isConnected = await testConnection();

    if (!isConnected) {
      logger.error('Failed to establish database connection', { context: 'database-plugin' });
      // Don't throw error to prevent server from crashing
      // The application can still work with degraded functionality
      return;
    }

    // Warm up connection pool for better initial performance
    await warmUpPool();

    logger.info('Database connection initialized successfully', { context: 'database-plugin' });

    // Log initial pool status
    const status = getPoolStatus();
    logger.info('Initial pool status', {
      context: 'database-plugin',
      metadata: {
        total: status.totalConnections,
        idle: status.idleConnections,
        waiting: status.waitingClients,
      },
    });

    const healthCheck = await dbMonitorService.performHealthCheck();
    logger.info(`Database health check: ${healthCheck ? 'PASSED' : 'FAILED'}`, {
      context: 'database-plugin',
    });
  } catch (error) {
    logger.error('Database initialization error', {
      context: 'database-plugin',
      error: (error as Error).message,
    });
  }

  // Graceful shutdown handling
  nitroApp.hooks.hook('close', async () => {
    logger.info('Shutting down database connections...', { context: 'database-plugin' });

    try {
      dbMonitorService.stop();

      await closeConnection();

      logger.info('Database shutdown completed successfully', { context: 'database-plugin' });
    } catch (error) {
      logger.error('Error during database shutdown', {
        context: 'database-plugin',
        error: (error as Error).message,
      });
    }
  });

  nitroApp.hooks.hook('error', async (error) => {
    // Log database-related errors
    if (error.message && error.message.toLowerCase().includes('database')) {
      logger.error('Database-related error detected', {
        context: 'database-plugin',
        error: error.message,
      });
      dbMonitorService.recordError(error.message);
    }
  });
});
