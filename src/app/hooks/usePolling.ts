import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing polling with cleanup and exponential backoff
 * Prevents memory leaks by properly cleaning up polling operations
 */

interface UsePollingOptions {
  /**
   * Initial polling interval in milliseconds
   * @default 2000
   */
  initialInterval?: number;

  /**
   * Maximum polling interval in milliseconds
   * @default 30000
   */
  maxInterval?: number;

  /**
   * Maximum number of polling attempts
   * @default 60
   */
  maxAttempts?: number;

  /**
   * Backoff multiplier for exponential backoff
   * @default 1.5
   */
  backoffMultiplier?: number;
}

interface PollingState {
  isActive: boolean;
  attempts: number;
  currentInterval: number;
}

/**
 * Hook to manage polling with exponential backoff and proper cleanup
 *
 * @example
 * const { startPolling, stopPolling } = usePolling({
 *   initialInterval: 2000,
 *   maxInterval: 30000,
 *   maxAttempts: 60,
 * });
 *
 * startPolling('job-123', async () => {
 *   const result = await fetchStatus();
 *   if (result.status === 'completed') {
 *     return { shouldContinue: false, data: result };
 *   }
 *   return { shouldContinue: true };
 * });
 */
export function usePolling(options: UsePollingOptions = {}) {
  const {
    initialInterval = 2000,
    maxInterval = 30000,
    maxAttempts = 60,
    backoffMultiplier = 1.5,
  } = options;

  // Store active polling operations by ID
  const activePolling = useRef<Map<string, PollingState>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const timeoutIds = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Calculate next interval with exponential backoff
   */
  const calculateNextInterval = useCallback(
    (currentInterval: number): number => {
      const nextInterval = Math.floor(currentInterval * backoffMultiplier);
      return Math.min(nextInterval, maxInterval);
    },
    [backoffMultiplier, maxInterval]
  );

  /**
   * Stop polling for a specific ID
   */
  const stopPolling = useCallback((pollingId: string) => {
    // Cancel any pending requests
    const controller = abortControllers.current.get(pollingId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(pollingId);
    }

    // Clear any pending timeouts
    const timeoutId = timeoutIds.current.get(pollingId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIds.current.delete(pollingId);
    }

    // Remove from active polling
    activePolling.current.delete(pollingId);
  }, []);

  /**
   * Start polling operation
   *
   * @param pollingId - Unique identifier for this polling operation
   * @param pollFn - Async function to call on each poll. Should return { shouldContinue, data? }
   * @param onComplete - Optional callback when polling completes successfully
   * @param onError - Optional callback when polling encounters an error
   */
  const startPolling = useCallback(
    <T = any>(
      pollingId: string,
      pollFn: (signal: AbortSignal) => Promise<{ shouldContinue: boolean; data?: T }>,
      onComplete?: (data?: T) => void,
      onError?: (error: Error) => void
    ) => {
      // Stop any existing polling with this ID
      stopPolling(pollingId);

      // Initialize polling state
      const state: PollingState = {
        isActive: true,
        attempts: 0,
        currentInterval: initialInterval,
      };
      activePolling.current.set(pollingId, state);

      // Create abort controller for this polling operation
      const controller = new AbortController();
      abortControllers.current.set(pollingId, controller);

      const poll = async () => {
        const currentState = activePolling.current.get(pollingId);
        if (!currentState || !currentState.isActive) {
          return;
        }

        try {
          // Check if we've exceeded max attempts
          if (currentState.attempts >= maxAttempts) {
            stopPolling(pollingId);
            const timeoutError = new Error(
              `Polling timeout: exceeded ${maxAttempts} attempts`
            );
            onError?.(timeoutError);
            return;
          }

          // Execute poll function
          const result = await pollFn(controller.signal);

          // Check if polling should continue
          if (!result.shouldContinue) {
            stopPolling(pollingId);
            onComplete?.(result.data);
            return;
          }

          // Update state for next attempt
          currentState.attempts++;
          currentState.currentInterval = calculateNextInterval(
            currentState.currentInterval
          );

          // Schedule next poll with exponential backoff
          const timeoutId = setTimeout(poll, currentState.currentInterval);
          timeoutIds.current.set(pollingId, timeoutId);
        } catch (error: any) {
          // Ignore abort errors (normal cleanup)
          if (error.name === 'AbortError') {
            return;
          }

          stopPolling(pollingId);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      };

      // Start polling immediately
      poll();
    },
    [initialInterval, maxAttempts, calculateNextInterval, stopPolling]
  );

  /**
   * Stop all active polling operations
   */
  const stopAllPolling = useCallback(() => {
    const pollingIds = Array.from(activePolling.current.keys());
    pollingIds.forEach((id) => stopPolling(id));
  }, [stopPolling]);

  /**
   * Check if a specific polling operation is active
   */
  const isPolling = useCallback((pollingId: string): boolean => {
    return activePolling.current.get(pollingId)?.isActive ?? false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPolling();
    };
  }, [stopAllPolling]);

  return {
    startPolling,
    stopPolling,
    stopAllPolling,
    isPolling,
  };
}
