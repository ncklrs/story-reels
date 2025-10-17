/**
 * Structured logger for production-ready logging
 * Supports multiple log levels and contextual information
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  jobId?: string;
  provider?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  private logLevel: LogLevel;
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string): LogLevel {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const parsed = level.toLowerCase() as LogLevel;
    return validLevels.includes(parsed) ? parsed : 'info';
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Format log entry as JSON
   */
  private formatLog(
    level: LogLevel,
    message: string,
    additionalContext?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...additionalContext,
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };

      console.error(this.formatLog('error', message, errorContext));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  /**
   * Add persistent context to this logger instance
   */
  addContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = createLogger();
