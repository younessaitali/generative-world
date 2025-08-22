export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  component?: string;
  service?: string;
  method?: string;
  context?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;
  private enabledInProduction: boolean;

  constructor() {
    this.level = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
    this.enabledInProduction = process.env.ENABLE_LOGGING === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production' && !this.enabledInProduction) {
      return level >= LogLevel.ERROR;
    }
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();

    let contextStr = '';
    if (context) {
      const contextEntries = Object.entries(context).map(([k, v]) => `${k}=${v}`);
      contextStr = ` [${contextEntries.join(', ')}]`;
    }

    return `[${timestamp}] ${level}${contextStr}: ${message}`;
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: LogContext,
    ...args: unknown[]
  ) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelName, message, context);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context, ...args);
  }

  info(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.INFO, 'INFO', message, context, ...args);
  }

  warn(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.WARN, 'WARN', message, context, ...args);
  }

  error(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.ERROR, 'ERROR', message, context, ...args);
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }
}

// singleton logger instance
export const logger = new Logger();

export const createServiceLogger = (serviceName: string) => ({
  debug: (message: string, method?: string, metadata?: Record<string, unknown>) =>
    logger.debug(message, { service: serviceName, method, ...metadata }),
  info: (message: string, method?: string, metadata?: Record<string, unknown>) =>
    logger.info(message, { service: serviceName, method, ...metadata }),
  warn: (message: string, method?: string, metadata?: Record<string, unknown>) =>
    logger.warn(message, { service: serviceName, method, ...metadata }),
  error: (message: string, method?: string, metadata?: Record<string, unknown>) =>
    logger.error(message, { service: serviceName, method, ...metadata }),
});
