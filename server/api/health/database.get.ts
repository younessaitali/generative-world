/**
 * Database health check endpoint
 * GET /api/health/database
 */

import { getPoolStatus } from '../../database/connection';
import { dbMonitorService } from '../../database/monitor';
import { getCircuitBreakerState } from '../../database/policies';
import { CircuitState } from 'cockatiel';

export default defineEventHandler(async (event) => {
  try {
    const healthCheck = await dbMonitorService.performHealthCheck();
    const poolStatus = getPoolStatus();
    const detailedStatus = dbMonitorService.getDetailedStatus();
    const circuitBreakerState = getCircuitBreakerState();

    const healthScore = calculateHealthScore(detailedStatus, circuitBreakerState);

    const response = {
      healthy: healthCheck && dbMonitorService.isPoolHealthy(),
      healthScore,
      timestamp: new Date().toISOString(),
      uptime: dbMonitorService.getUptimeSeconds(),
      pool: {
        total: poolStatus.totalConnections,
        idle: poolStatus.idleConnections,
        waiting: poolStatus.waitingClients,
        utilization: detailedStatus.pool.utilization,
        maxConnections: detailedStatus.pool.maxConnections,
      },
      performance: {
        totalQueries: detailedStatus.pool.totalQueries,
        averageQueryTime: detailedStatus.performance.averageQueryTime,
        errorRate: detailedStatus.performance.errorRate,
        lastError: detailedStatus.performance.lastError,
        lastErrorTime: detailedStatus.performance.lastErrorTime,
      },
      circuitBreaker: {
        state: circuitBreakerState.state,
      },
      thresholds: detailedStatus.thresholds,
    };

    const status = response.healthy ? 200 : 503;
    setResponseStatus(event, status);

    return response;
  } catch (error) {
    console.error('Health check endpoint error:', (error as Error).message);

    setResponseStatus(event, 503);
    return {
      healthy: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
});

function calculateHealthScore(
  status: ReturnType<typeof dbMonitorService.getDetailedStatus>,
  circuitBreakerState: ReturnType<typeof getCircuitBreakerState>,
): number {
  let score = 100;

  if (status.pool.utilization > 90) {
    score -= 30;
  } else if (status.pool.utilization > 80) {
    score -= 15;
  } else if (status.pool.utilization > 70) {
    score -= 5;
  }

  if (status.performance.averageQueryTime > 2000) {
    score -= 25;
  } else if (status.performance.averageQueryTime > 1000) {
    score -= 10;
  } else if (status.performance.averageQueryTime > 500) {
    score -= 5;
  }

  if (status.performance.errorRate > 10) {
    score -= 30;
  } else if (status.performance.errorRate > 5) {
    score -= 15;
  } else if (status.performance.errorRate > 1) {
    score -= 5;
  }

  if (circuitBreakerState.state === CircuitState.Open) {
    score -= 50;
  } else if (circuitBreakerState.state === CircuitState.HalfOpen) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}
