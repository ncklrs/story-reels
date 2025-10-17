"use strict";
/**
 * Structured logger for production-ready logging
 * Supports multiple log levels and contextual information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
exports.createLogger = createLogger;
class Logger {
    constructor(context = {}) {
        this.context = context;
        this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    }
    /**
     * Parse log level from string
     */
    parseLogLevel(level) {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        const parsed = level.toLowerCase();
        return validLevels.includes(parsed) ? parsed : 'info';
    }
    /**
     * Check if a log level should be logged
     */
    shouldLog(level) {
        const levels = {
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
    formatLog(level, message, additionalContext) {
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
    debug(message, context) {
        if (this.shouldLog('debug')) {
            console.log(this.formatLog('debug', message, context));
        }
    }
    /**
     * Log info message
     */
    info(message, context) {
        if (this.shouldLog('info')) {
            console.log(this.formatLog('info', message, context));
        }
    }
    /**
     * Log warning message
     */
    warn(message, context) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatLog('warn', message, context));
        }
    }
    /**
     * Log error message
     */
    error(message, error, context) {
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
    child(context) {
        return new Logger({ ...this.context, ...context });
    }
    /**
     * Add persistent context to this logger instance
     */
    addContext(context) {
        this.context = { ...this.context, ...context };
    }
}
exports.Logger = Logger;
/**
 * Create a new logger instance
 */
function createLogger(context) {
    return new Logger(context);
}
/**
 * Default logger instance
 */
exports.logger = createLogger();
//# sourceMappingURL=logger.js.map