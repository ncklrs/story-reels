/**
 * Video Generation Error Handling
 *
 * Centralized error handling for Sora 2 and Veo 3.1 APIs
 * Provides standardized error codes, retry logic, and error classification
 */

/**
 * Standard error codes for video generation failures
 */
export enum VideoErrorCode {
  // Authentication & Authorization
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ORGANIZATION_NOT_VERIFIED = 'ORGANIZATION_NOT_VERIFIED',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Content Policy
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  SAFETY_FILTER_TRIGGERED = 'SAFETY_FILTER_TRIGGERED',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',

  // Request Validation
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PROMPT = 'INVALID_PROMPT',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  PROMPT_TOO_LONG = 'PROMPT_TOO_LONG',
  UNSUPPORTED_RESOLUTION = 'UNSUPPORTED_RESOLUTION',
  UNSUPPORTED_DURATION = 'UNSUPPORTED_DURATION',

  // Generation Failures
  GENERATION_FAILED = 'GENERATION_FAILED',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  MODEL_OVERLOADED = 'MODEL_OVERLOADED',
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',

  // Network & Infrastructure
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  // Job Status
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_EXPIRED = 'JOB_EXPIRED',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for video generation operations
 */
export class VideoGenerationError extends Error {
  public readonly code: VideoErrorCode;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly provider?: 'sora' | 'veo';
  public readonly originalError?: any;

  constructor(
    message: string,
    code: VideoErrorCode,
    options: {
      retryable?: boolean;
      statusCode?: number;
      provider?: 'sora' | 'veo';
      originalError?: any;
    } = {}
  ) {
    super(message);
    this.name = 'VideoGenerationError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
    this.provider = options.provider;
    this.originalError = options.originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VideoGenerationError);
    }
  }

  /**
   * Convert error to JSON for logging/storage
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      statusCode: this.statusCode,
      provider: this.provider,
      stack: this.stack,
    };
  }
}

/**
 * Handle Sora API errors and convert to VideoGenerationError
 */
export function handleSoraError(error: any): VideoGenerationError {
  console.error('[Sora Error]', error);

  // OpenAI API error structure
  if (error?.response) {
    const status = error.response.status;
    const errorData = error.response.data?.error;
    const errorMessage = errorData?.message || error.message;
    const errorCode = errorData?.code;
    const errorType = errorData?.type;

    // 401 - Invalid API Key
    if (status === 401) {
      return new VideoGenerationError(
        'Invalid OpenAI API key. Please check your credentials.',
        VideoErrorCode.INVALID_API_KEY,
        { retryable: false, statusCode: 401, provider: 'sora', originalError: error }
      );
    }

    // 403 - Organization not verified
    if (status === 403 && errorMessage?.includes('organization must be verified')) {
      return new VideoGenerationError(
        'Your OpenAI organization must be verified to use Sora. Visit platform.openai.com/settings/organization/general to verify.',
        VideoErrorCode.ORGANIZATION_NOT_VERIFIED,
        { retryable: false, statusCode: 403, provider: 'sora', originalError: error }
      );
    }

    // 429 - Rate limiting
    if (status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const message = retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please try again later.';

      return new VideoGenerationError(
        message,
        VideoErrorCode.RATE_LIMIT_EXCEEDED,
        { retryable: true, statusCode: 429, provider: 'sora', originalError: error }
      );
    }

    // 400 - Content policy violation or bad request
    if (status === 400) {
      if (errorMessage?.toLowerCase().includes('content policy') ||
          errorMessage?.toLowerCase().includes('safety')) {
        return new VideoGenerationError(
          `Content policy violation: ${errorMessage}`,
          VideoErrorCode.CONTENT_POLICY_VIOLATION,
          { retryable: false, statusCode: 400, provider: 'sora', originalError: error }
        );
      }

      if (errorMessage?.toLowerCase().includes('prompt')) {
        return new VideoGenerationError(
          `Invalid prompt: ${errorMessage}`,
          VideoErrorCode.INVALID_PROMPT,
          { retryable: false, statusCode: 400, provider: 'sora', originalError: error }
        );
      }

      return new VideoGenerationError(
        `Invalid request: ${errorMessage}`,
        VideoErrorCode.INVALID_REQUEST,
        { retryable: false, statusCode: 400, provider: 'sora', originalError: error }
      );
    }

    // 402 - Payment/credits required
    if (status === 402) {
      return new VideoGenerationError(
        'Insufficient credits. Please add credits to your OpenAI account.',
        VideoErrorCode.INSUFFICIENT_CREDITS,
        { retryable: false, statusCode: 402, provider: 'sora', originalError: error }
      );
    }

    // 404 - Job not found
    if (status === 404) {
      return new VideoGenerationError(
        'Video job not found. It may have expired.',
        VideoErrorCode.JOB_NOT_FOUND,
        { retryable: false, statusCode: 404, provider: 'sora', originalError: error }
      );
    }

    // 500+ - Server errors (retryable)
    if (status >= 500) {
      return new VideoGenerationError(
        `OpenAI service error: ${errorMessage}`,
        status === 503 ? VideoErrorCode.SERVICE_UNAVAILABLE : VideoErrorCode.INTERNAL_SERVER_ERROR,
        { retryable: true, statusCode: status, provider: 'sora', originalError: error }
      );
    }
  }

  // Network connection errors
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return new VideoGenerationError(
      'Network error connecting to OpenAI. Please check your internet connection.',
      VideoErrorCode.NETWORK_ERROR,
      { retryable: true, provider: 'sora', originalError: error }
    );
  }

  // Timeout errors (including ETIMEDOUT)
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout') || error?.name === 'AbortError') {
    return new VideoGenerationError(
      'Request timed out. Please try again.',
      VideoErrorCode.TIMEOUT,
      { retryable: true, provider: 'sora', originalError: error }
    );
  }

  // Unknown error
  return new VideoGenerationError(
    `Sora video generation failed: ${error?.message || 'Unknown error'}`,
    VideoErrorCode.UNKNOWN_ERROR,
    { retryable: false, provider: 'sora', originalError: error }
  );
}

/**
 * Handle Veo API errors and convert to VideoGenerationError
 */
export function handleVeoError(error: any): VideoGenerationError {
  console.error('[Veo Error]', error);

  // Google Cloud API error structure
  if (error?.response) {
    const status = error.response.status;
    const errorData = error.response.data?.error;
    const errorMessage = errorData?.message || error.message;
    const errorCode = errorData?.code;
    const errorStatus = errorData?.status;

    // 401 - Invalid credentials
    if (status === 401 || errorStatus === 'UNAUTHENTICATED') {
      return new VideoGenerationError(
        'Invalid Google Cloud credentials. Please check your API key and project configuration.',
        VideoErrorCode.INVALID_CREDENTIALS,
        { retryable: false, statusCode: 401, provider: 'veo', originalError: error }
      );
    }

    // 403 - Permission denied or quota exceeded
    if (status === 403 || errorStatus === 'PERMISSION_DENIED') {
      if (errorMessage?.toLowerCase().includes('quota')) {
        return new VideoGenerationError(
          'Quota exceeded. Please check your Google Cloud quota limits.',
          VideoErrorCode.INSUFFICIENT_QUOTA,
          { retryable: false, statusCode: 403, provider: 'veo', originalError: error }
        );
      }

      return new VideoGenerationError(
        `Permission denied: ${errorMessage}`,
        VideoErrorCode.INVALID_CREDENTIALS,
        { retryable: false, statusCode: 403, provider: 'veo', originalError: error }
      );
    }

    // 429 - Rate limiting
    if (status === 429 || errorStatus === 'RESOURCE_EXHAUSTED') {
      return new VideoGenerationError(
        'Rate limit exceeded for Veo API. Please try again later.',
        VideoErrorCode.RATE_LIMIT_EXCEEDED,
        { retryable: true, statusCode: 429, provider: 'veo', originalError: error }
      );
    }

    // 400 - Bad request
    if (status === 400 || errorStatus === 'INVALID_ARGUMENT') {
      // Safety filter
      if (errorMessage?.toLowerCase().includes('safety') ||
          errorMessage?.toLowerCase().includes('policy')) {
        return new VideoGenerationError(
          `Content safety filter triggered: ${errorMessage}`,
          VideoErrorCode.SAFETY_FILTER_TRIGGERED,
          { retryable: false, statusCode: 400, provider: 'veo', originalError: error }
        );
      }

      // Invalid parameters
      if (errorMessage?.toLowerCase().includes('resolution')) {
        return new VideoGenerationError(
          `Unsupported resolution: ${errorMessage}`,
          VideoErrorCode.UNSUPPORTED_RESOLUTION,
          { retryable: false, statusCode: 400, provider: 'veo', originalError: error }
        );
      }

      if (errorMessage?.toLowerCase().includes('duration')) {
        return new VideoGenerationError(
          `Unsupported duration: ${errorMessage}`,
          VideoErrorCode.UNSUPPORTED_DURATION,
          { retryable: false, statusCode: 400, provider: 'veo', originalError: error }
        );
      }

      return new VideoGenerationError(
        `Invalid request parameters: ${errorMessage}`,
        VideoErrorCode.INVALID_PARAMETERS,
        { retryable: false, statusCode: 400, provider: 'veo', originalError: error }
      );
    }

    // 404 - Not found
    if (status === 404 || errorStatus === 'NOT_FOUND') {
      return new VideoGenerationError(
        'Video operation not found. It may have expired.',
        VideoErrorCode.JOB_NOT_FOUND,
        { retryable: false, statusCode: 404, provider: 'veo', originalError: error }
      );
    }

    // 500+ - Server errors (retryable)
    if (status >= 500 || errorStatus === 'INTERNAL' || errorStatus === 'UNAVAILABLE') {
      return new VideoGenerationError(
        `Google Cloud service error: ${errorMessage}`,
        status === 503 || errorStatus === 'UNAVAILABLE'
          ? VideoErrorCode.SERVICE_UNAVAILABLE
          : VideoErrorCode.INTERNAL_SERVER_ERROR,
        { retryable: true, statusCode: status, provider: 'veo', originalError: error }
      );
    }

    // 504 - Timeout
    if (status === 504 || errorStatus === 'DEADLINE_EXCEEDED') {
      return new VideoGenerationError(
        'Request timed out. The video generation is taking longer than expected.',
        VideoErrorCode.GENERATION_TIMEOUT,
        { retryable: true, statusCode: 504, provider: 'veo', originalError: error }
      );
    }
  }

  // Network connection errors
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return new VideoGenerationError(
      'Network error connecting to Google Cloud. Please check your internet connection.',
      VideoErrorCode.NETWORK_ERROR,
      { retryable: true, provider: 'veo', originalError: error }
    );
  }

  // Timeout errors (including ETIMEDOUT)
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout') || error?.name === 'AbortError') {
    return new VideoGenerationError(
      'Request timed out. Please try again.',
      VideoErrorCode.TIMEOUT,
      { retryable: true, provider: 'veo', originalError: error }
    );
  }

  // Unknown error
  return new VideoGenerationError(
    `Veo video generation failed: ${error?.message || 'Unknown error'}`,
    VideoErrorCode.UNKNOWN_ERROR,
    { retryable: false, provider: 'veo', originalError: error }
  );
}

/**
 * Determine if an error should be retried based on retry count
 */
export function shouldRetry(error: VideoGenerationError, retryCount: number, maxRetries: number = 3): boolean {
  if (!error.retryable) {
    return false;
  }

  if (retryCount >= maxRetries) {
    return false;
  }

  return true;
}

/**
 * Calculate exponential backoff delay for retries
 * @param retryCount Current retry attempt (0-indexed)
 * @param baseDelay Base delay in milliseconds (default: 1000ms)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  // Exponential backoff: baseDelay * 2^retryCount with jitter
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000; // Add up to 1s of random jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (error: VideoGenerationError, retryCount: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  let lastError: VideoGenerationError;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      return await fn();
    } catch (error: unknown) {
      // Convert to VideoGenerationError if it isn't already
      if (error instanceof VideoGenerationError) {
        lastError = error;
      } else if (error instanceof Error) {
        lastError = new VideoGenerationError(
          error.message,
          VideoErrorCode.UNKNOWN_ERROR,
          { originalError: error, retryable: true }
        );
      } else {
        // Handle non-Error objects (strings, objects, etc.)
        const errorMessage = typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'Unknown error';
        lastError = new VideoGenerationError(
          errorMessage,
          VideoErrorCode.UNKNOWN_ERROR,
          { originalError: error, retryable: true }
        );
      }

      // Check if we should retry
      if (!shouldRetry(lastError, retryCount, maxRetries)) {
        throw lastError;
      }

      // Call retry callback
      if (onRetry) {
        onRetry(lastError, retryCount);
      }

      // Wait before retrying
      const delay = getRetryDelay(retryCount, baseDelay);
      console.log(`[Retry] Attempt ${retryCount + 1}/${maxRetries}. Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Log error details for debugging
 */
export function logError(error: VideoGenerationError, context?: Record<string, any>): void {
  console.error('[VideoGenerationError]', {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    statusCode: error.statusCode,
    provider: error.provider,
    context,
    stack: error.stack,
  });
}
