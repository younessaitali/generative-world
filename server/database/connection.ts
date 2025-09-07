import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig, type PoolClient } from 'pg';
import * as schema from './schema';
import { executeWithPolicy } from './policies';
import { dbMonitorService } from './monitor';
import { logger } from '#shared/utils/logger';

function getPoolConfig(): PoolConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseConfig: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    database: process.env.DB_NAME || 'generative_world',
    user: process.env.DB_USERNAME || 'generative_world_user',
    password: process.env.DB_PASSWORD || 'generative_world_pass',

    max: Number(process.env.DB_POOL_MAX) || (isProduction ? 50 : 20),
    min: Number(process.env.DB_POOL_MIN) || 5,

    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 120000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 20000,
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT) || 60000,
    query_timeout: Number(process.env.DB_QUERY_TIMEOUT) || 45000,

    allowExitOnIdle: true,

    application_name: 'generative_world_game',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  if (isProduction) {
    baseConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return baseConfig;
}

const poolConfig = getPoolConfig();
logger.info(`Database pool configuration`, {
  context: 'database',
  metadata: {
    max: poolConfig.max,
    min: poolConfig.min,
    idleTimeout: poolConfig.idleTimeoutMillis,
    connectionTimeout: poolConfig.connectionTimeoutMillis,
    environment: process.env.NODE_ENV || 'development',
  },
});

const pool = new Pool(poolConfig);

dbMonitorService.setPool(pool);

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' && process.env.DB_LOG_QUERIES === 'true',
});

export { pool };

export async function closeConnection(): Promise<void> {
  try {
    logger.info('Closing database connections...', { context: 'database' });
    dbMonitorService.stop();
    await pool.end();
    logger.info('Database connections closed successfully', { context: 'database' });
  } catch (error) {
    logger.error('Error closing database connections', {
      context: 'database',
      error: (error as Error).message,
    });
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  return executeWithPolicy(async () => {
    const client = await pool.connect();

    try {
      await client.query('SELECT 1 as connection_test');
      client.release();
      logger.info('Database connection test successful', { context: 'database' });
      return true;
    } catch (error) {
      client.release();
      throw error;
    }
  });
}

export async function warmUpPool(): Promise<void> {
  const minConnections = Number(process.env.DB_POOL_MIN) || 5;
  logger.info(`Warming up connection pool with ${minConnections} connections...`, {
    context: 'database',
  });

  const connections: PoolClient[] = [];

  try {
    for (let i = 0; i < minConnections; i++) {
      const client = await pool.connect();
      connections.push(client);
      await client.query('SELECT 1');
    }

    for (const client of connections) {
      client.release();
    }

    logger.info(`Connection pool warmed up with ${minConnections} connections`, {
      context: 'database',
    });
  } catch (error) {
    for (const client of connections) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error('Error releasing client', {
          context: 'database',
          error: (releaseError as Error).message,
        });
      }
      throw error;
    }
  }
}

export async function getConnection() {
  return executeWithPolicy(async () => {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;

    dbMonitorService.recordQuery(duration, true);

    if (duration > 1000) {
      logger.warn(`Slow connection acquisition: ${duration}ms`, { context: 'database' });
    }

    return client;
  });
}

export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  context: string = 'query',
): Promise<T> {
  return executeWithPolicy(async () => {
    const start = Date.now();
    logger.info(`Executing query`, { context: `db:${context}` });

    try {
      const result = await queryFn();
      const duration = Date.now() - start;

      dbMonitorService.recordQuery(duration, true);
      logger.info(`Query successful`, {
        context: `db:${context}`,
        metadata: { duration: `${duration}ms` },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      dbMonitorService.recordQuery(duration, false);
      logger.error(`Query failed`, {
        context: `db:${context}`,
        error: (error as Error).message,
        metadata: { duration: `${duration}ms` },
      });
      throw error;
    }
  });
}

export function getPoolStatus() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    monitoring: dbMonitorService.getDetailedStatus(),
  };
}
