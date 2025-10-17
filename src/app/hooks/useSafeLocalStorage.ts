import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for safely using localStorage with SSR support and debounced saves
 * Handles common edge cases:
 * - SSR/hydration (only accesses localStorage on client)
 * - Quota exceeded errors
 * - Debounced saves to reduce write frequency
 * - Parse errors for corrupted data
 */

interface UseSafeLocalStorageOptions<T> {
  /**
   * Debounce delay for saving to localStorage (in milliseconds)
   * @default 500
   */
  debounceMs?: number;

  /**
   * Serializer function
   * @default JSON.stringify
   */
  serializer?: (value: T) => string;

  /**
   * Deserializer function
   * @default JSON.parse
   */
  deserializer?: (value: string) => T;

  /**
   * Callback when save fails
   */
  onSaveError?: (error: Error) => void;

  /**
   * Callback when load fails
   */
  onLoadError?: (error: Error) => void;
}

/**
 * Safely use localStorage with SSR support, debouncing, and error handling
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if no stored value exists
 * @param options - Configuration options
 * @returns [value, setValue, { isLoading, error, remove }]
 *
 * @example
 * const [storyboard, setStoryboard, { isLoading }] = useSafeLocalStorage(
 *   'storyboard',
 *   defaultStoryboard,
 *   { debounceMs: 500 }
 * );
 */
export function useSafeLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseSafeLocalStorageOptions<T> = {}
): [
  T,
  (value: T | ((prev: T) => T)) => void,
  { isLoading: boolean; error: Error | null; remove: () => void }
] {
  const {
    debounceMs = 500,
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    onSaveError,
    onLoadError,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to track pending saves and avoid stale closures
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  /**
   * Check if we're in a browser environment
   */
  const isBrowser = typeof window !== 'undefined';

  /**
   * Load initial value from localStorage (client-side only)
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (!isBrowser) {
      setIsLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsed = deserializer(item);
        setStoredValue(parsed);
      }
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Error loading from localStorage (key: ${key}):`, error);
      setError(error);
      onLoadError?.(error);
    } finally {
      setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [key, isBrowser, deserializer, onLoadError]);

  /**
   * Save value to localStorage with debouncing
   */
  const saveToLocalStorage = useCallback(
    (value: T) => {
      if (!isBrowser) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const serialized = serializer(value);
          window.localStorage.setItem(key, serialized);
          setError(null);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          // Handle quota exceeded error
          if (
            error.name === 'QuotaExceededError' ||
            error.message.includes('quota')
          ) {
            const quotaError = new Error(
              `localStorage quota exceeded for key: ${key}. Consider clearing old data.`
            );
            console.error(quotaError);
            setError(quotaError);
            onSaveError?.(quotaError);
          } else {
            console.error(`Error saving to localStorage (key: ${key}):`, error);
            setError(error);
            onSaveError?.(error);
          }
        }
      }, debounceMs);
    },
    [key, serializer, debounceMs, isBrowser, onSaveError]
  );

  /**
   * Update stored value
   */
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function (like useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Update state immediately for responsive UI
        setStoredValue(valueToStore);

        // Save to localStorage with debouncing
        saveToLocalStorage(valueToStore);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error in setValue:', error);
        setError(error);
      }
    },
    [storedValue, saveToLocalStorage]
  );

  /**
   * Remove item from localStorage
   */
  const remove = useCallback(() => {
    if (!isBrowser) return;

    try {
      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Error removing from localStorage (key: ${key}):`, error);
      setError(error);
    }
  }, [key, initialValue, isBrowser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return [storedValue, setValue, { isLoading, error, remove }];
}
