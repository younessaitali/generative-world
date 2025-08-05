import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig, type PoolClient } from 'pg';
import * as schema from './schema';
import { executeWithPolicy } from './policies';
import { dbMonitorService } from './monitor';

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

    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 5000,
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT) || 10000,
    query_timeout: Number(process.env.DB_QUERY_TIMEOUT) || 8000,

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
console.log(`🔧 Database pool configuration:`, {
  max: poolConfig.max,
  min: poolConfig.min,
  idleTimeout: poolConfig.idleTimeoutMillis,
  connectionTimeout: poolConfig.connectionTimeoutMillis,
  environment: process.env.NODE_ENV || 'development',
});

const pool = new Pool(poolConfig);

dbMonitorService.setPool(pool);

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

export { pool };


export async function closeConnection(): Promise<void> {
  try {
    console.log('🔌 Closing database connections...');
    dbMonitorService.stop();
    await pool.end();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', (error as Error).message);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  return executeWithPolicy(async () => {
    const client = await pool.connect();

    try {
      await client.query('SELECT 1 as connection_test');
      client.release();
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      client.release();
      throw error;
    }
  });
}

export async function warmUpPool(): Promise<void> {
  const minConnections = Number(process.env.DB_POOL_MIN) || 5;
  console.log(`🔥 Warming up connection pool with ${minConnections} connections...`);

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

    console.log(`✅ Connection pool warmed up with ${minConnections} connections`);
  } catch (error) {
    for (const client of connections) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('❌ Error releasing client:', (releaseError as Error).message);
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
      console.warn(`🐌 Slow connection acquisition: ${duration}ms`);
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

    try {
      const result = await queryFn();
      const duration = Date.now() - start;

      dbMonitorService.recordQuery(duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      dbMonitorService.recordQuery(duration, false);
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
