/**
 * Database connection pool monitoring service
 */

import type { Pool } from 'pg';
import { logger } from '#shared/utils/logger';

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
  uptime: number;
  totalQueries: number;
  errorCount: number;
  averageQueryTime: number;
  timestamp: number;
}

interface QueryMetrics {
  count: number;
  totalTime: number;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
}

export class DatabaseMonitorService {
  private pool: Pool | null = null;
  private startTime: number;
  private queryMetrics: QueryMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = true;
  private lastHealthCheck = 0;

  constructor() {
    this.startTime = Date.now();
    this.queryMetrics = {
      count: 0,
      totalTime: 0,
      errors: 0,
    };
  }

  setPool(pool: Pool): void {
    this.pool = pool;
    this.attachPoolEventListeners();
    this.startMonitoring();
  }

  private attachPoolEventListeners(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      logger.info('New database connection established', { context: 'db-monitor' });
    });

    this.pool.on('acquire', () => {
      // Connection acquired from pool - this happens frequently, so we don't log it
    });

    this.pool.on('remove', () => {
      logger.info('Database connection removed from pool', { context: 'db-monitor' });
    });

    this.pool.on('error', (error) => {
      logger.error('Database pool error', { context: 'db-monitor', error: error.message });
      this.recordError(error.message);
      this.isHealthy = false;
    });
  }

  private startMonitoring(): void {
    const monitorInterval = Number(process.env.DB_MONITOR_INTERVAL) || 30000;
    const healthCheckInterval = Number(process.env.DB_HEALTH_CHECK_INTERVAL) || 15000;

    // Pool metrics monitoring
    this.monitoringInterval = setInterval(() => {
      this.logPoolMetrics();
    }, monitorInterval);

    // Health check monitoring
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, healthCheckInterval);

    logger.info(
      `Database monitoring started (metrics: ${monitorInterval}ms, health: ${healthCheckInterval}ms)`,
      { context: 'db-monitor' },
    );
  }

  async performHealthCheck(): Promise<boolean> {
    if (!this.pool) {
      this.isHealthy = false;
      return false;
    }

    try {
      const client = await this.pool.connect();
      const start = Date.now();

      await client.query('SELECT 1 as health_check');

      const duration = Date.now() - start;
      client.release();

      this.isHealthy = true;
      this.lastHealthCheck = Date.now();

      if (duration > 1000) {
        logger.warn(`Slow health check: ${duration}ms`, { context: 'db-monitor' });
      }

      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        context: 'db-monitor',
        error: (error as Error).message,
      });
      this.recordError((error as Error).message);
      this.isHealthy = false;
      return false;
    }
  }

  recordQuery(duration: number, success: boolean = true): void {
    this.queryMetrics.count++;
    this.queryMetrics.totalTime += duration;

    if (!success) {
      this.queryMetrics.errors++;
    }
  }

  recordError(errorMessage: string): void {
    this.queryMetrics.errors++;
    this.queryMetrics.lastError = errorMessage;
    this.queryMetrics.lastErrorTime = Date.now();
  }

  getMetrics(): PoolMetrics {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      maxConnections: Number(process.env.DB_POOL_MAX) || 20,
      uptime: Date.now() - this.startTime,
      totalQueries: this.queryMetrics.count,
      errorCount: this.queryMetrics.errors,
      averageQueryTime:
        this.queryMetrics.count > 0 ? this.queryMetrics.totalTime / this.queryMetrics.count : 0,
      timestamp: Date.now(),
    };
  }

  getDetailedStatus() {
    const metrics = this.getMetrics();
    const errorRate =
      metrics.totalQueries > 0 ? (metrics.errorCount / metrics.totalQueries) * 100 : 0;

    return {
      pool: {
        healthy: this.isHealthy,
        lastHealthCheck: this.lastHealthCheck,
        utilization: (metrics.totalConnections / metrics.maxConnections) * 100,
        ...metrics,
      },
      performance: {
        errorRate: Number(errorRate.toFixed(2)),
        averageQueryTime: Number(metrics.averageQueryTime.toFixed(2)),
        lastError: this.queryMetrics.lastError,
        lastErrorTime: this.queryMetrics.lastErrorTime,
      },
      thresholds: {
        highUtilization: 80,
        slowQuery: 1000,
        highErrorRate: 5,
      },
    };
  }

  private logPoolMetrics(): void {
    try {
      const status = this.getDetailedStatus();
      const logLevel = process.env.DB_POOL_LOG_LEVEL || 'info';

      if (logLevel === 'debug' || this.shouldLogWarning(status)) {
        logger.info('Database Pool Status', {
          context: 'db-monitor',
          metadata: {
            connections: `${status.pool.totalConnections}/${status.pool.maxConnections}`,
            idle: status.pool.idleConnections,
            waiting: status.pool.waitingClients,
            utilization: `${status.pool.utilization.toFixed(1)}%`,
            queries: status.pool.totalQueries,
            avgTime: `${status.performance.averageQueryTime}ms`,
            errorRate: `${status.performance.errorRate}%`,
            healthy: status.pool.healthy,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to log pool metrics', {
        context: 'db-monitor',
        error: (error as Error).message,
      });
    }
  }

  private shouldLogWarning(status: ReturnType<typeof this.getDetailedStatus>): boolean {
    return (
      status.pool.utilization > status.thresholds.highUtilization ||
      status.performance.averageQueryTime > status.thresholds.slowQuery ||
      status.performance.errorRate > status.thresholds.highErrorRate ||
      !status.pool.healthy
    );
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Database monitoring stopped', { context: 'db-monitor' });
  }

  isPoolHealthy(): boolean {
    return this.isHealthy;
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

// Global instance
export const dbMonitorService = new DatabaseMonitorService();
