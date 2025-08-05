import {
  retry,
  circuitBreaker,
  handleAll,
  ExponentialBackoff,
  ConsecutiveBreaker,
  wrap
} from 'cockatiel'

export const databaseRetryPolicy = retry(handleAll, {
  maxAttempts: 5,
  backoff: new ExponentialBackoff({
    initialDelay: 100,
    maxDelay: 1600,
  })
})


export const databaseCircuitBreakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 30 * 1000, // 30 seconds
  breaker: new ConsecutiveBreaker(5) // 5 consecutive failures
})

export const databasePolicy = wrap(databaseRetryPolicy, databaseCircuitBreakerPolicy)


export function setupDatabasePolicyMonitoring() {
  databaseRetryPolicy.onRetry(({ delay, attempt }: any) => {
    console.warn(`Database retry attempt ${attempt}, waiting ${delay}ms`)
  })

  databaseRetryPolicy.onGiveUp(({ reason }: any) => {
    console.error('Database operation gave up after all retries', reason)
  })

  databaseCircuitBreakerPolicy.onBreak(() => {
    console.error('Database circuit breaker opened - failing fast')
  })

  databaseCircuitBreakerPolicy.onReset(() => {
    console.info('Database circuit breaker closed - operations resumed')
  })

  databaseCircuitBreakerPolicy.onHalfOpen(() => {
    console.info('Database circuit breaker half-open - testing connection')
  })

  databasePolicy.onSuccess(({ duration }: any) => {
    console.debug(`Database operation succeeded in ${duration}ms`)
  })

  databasePolicy.onFailure(({ duration, reason, handled }: any) => {
    if (handled) {
      console.warn(`Database operation failed in ${duration}ms (handled)`, reason)
    } else {
      console.error(`Database operation failed in ${duration}ms (unhandled)`, reason)
    }
  })
}

setupDatabasePolicyMonitoring()


export async function executeWithPolicy<T>(operation: () => Promise<T>): Promise<T> {
  return databasePolicy.execute(operation)
}


export function getCircuitBreakerState() {
  return {
    state: databaseCircuitBreakerPolicy.state,
  }
}
