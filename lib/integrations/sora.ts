import OpenAI from 'openai';
import { SoraGenerateRequest } from '../types';
import { handleSoraError, retryWithBackoff, logError, VideoGenerationError } from './errors';

/**
 * Sora 2 API Integration
 * Documentation: https://platform.openai.com/docs/guides/video-generation
 *
 * Note: As of October 2025, the Sora 2 API is in limited preview. This implementation
 * includes both real API calls and mock fallback for development/testing.
 *
 * Environment variables:
 * - SORA_MOCK_MODE: Set to 'true' to use mock responses (development/testing)
 * - OPENAI_API_KEY: Your OpenAI API key (required for real API calls)
 */

/**
 * API request timeout in milliseconds (60 seconds)
 * Prevents requests from hanging indefinitely
 */
const API_TIMEOUT_MS = 60000;

export interface SoraVideoResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Mock job storage for development mode
 */
const mockJobs = new Map<string, {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startTime: number;
  prompt: string;
  model: string;
}>();

/**
 * Cleanup old mock jobs to prevent memory leaks
 * Removes jobs older than 5 minutes
 */
function cleanupOldMockJobs(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  let cleanedCount = 0;

  for (const [jobId, job] of mockJobs.entries()) {
    if (now - job.startTime > maxAge) {
      mockJobs.delete(jobId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log('[Sora Mock] Cleaned up old jobs', {
      count: cleanedCount,
      remaining: mockJobs.size
    });
  }
}

/**
 * Initialize cleanup interval for mock jobs
 * Only runs in server environment and mock mode
 */
let mockCleanupInterval: NodeJS.Timeout | null = null;

function initMockJobCleanup(): void {
  // Don't start cleanup if not in mock mode or in browser
  if (typeof window !== 'undefined' || !isMockMode()) {
    return;
  }

  if (mockCleanupInterval) {
    return;
  }

  mockCleanupInterval = setInterval(() => {
    cleanupOldMockJobs();
  }, 60000); // Run every minute

  console.log('[Sora Mock] Cleanup interval initialized');
}

// Auto-initialize cleanup on server startup in mock mode
if (typeof window === 'undefined' && isMockMode()) {
  initMockJobCleanup();
}

/**
 * Check if mock mode is enabled
 */
function isMockMode(): boolean {
  return process.env.SORA_MOCK_MODE === 'true';
}

/**
 * Initialize Sora video generation
 */
export async function generateSoraVideo(
  apiKey: string,
  request: SoraGenerateRequest
): Promise<{ jobId: string }> {
  console.log('[Sora] Starting video generation', {
    model: request.model,
    duration: request.seconds,
    mockMode: isMockMode()
  });

  // Use mock mode if enabled
  if (isMockMode()) {
    return mockSoraGeneration(request);
  }

  // Real API implementation with retry logic
  try {
    return await retryWithBackoff(
      async () => {
        const openai = new OpenAI({ apiKey });

        try {
          // Sora 2 API endpoint (based on OpenAI's video generation API structure)
          // POST https://api.openai.com/v1/video/generations
          const response = await fetch('https://api.openai.com/v1/video/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.model,
              prompt: request.prompt,
              orientation: mapSizeToOrientation(request.size),
              duration: request.seconds,
              quality: request.model === 'sora-2-pro' ? 'pro' : 'standard',
              ...(request.image_reference && { image: request.image_reference })
            }),
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
              response: {
                status: response.status,
                data: errorData
              },
              message: errorData.error?.message || response.statusText
            };
          }

          const data = await response.json();

          // Validate response structure
          if (!data || (typeof data !== 'object')) {
            throw new Error('Invalid response format from Sora API');
          }

          const jobId = data.id || data.job_id;

          if (!jobId || typeof jobId !== 'string') {
            throw new Error('No valid job ID returned from Sora API');
          }

          console.log('[Sora] Video generation initiated', { jobId });

          return { jobId };
        } catch (error: any) {
          throw handleSoraError(error);
        }
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (error, retryCount) => {
          console.warn(`[Sora] Retry attempt ${retryCount + 1} after error:`, error.message);
        }
      }
    );
  } catch (error: any) {
    if (error instanceof VideoGenerationError) {
      logError(error, { request });
      throw error;
    }
    const wrappedError = handleSoraError(error);
    logError(wrappedError, { request });
    throw wrappedError;
  }
}

/**
 * Poll Sora video status
 */
export async function getSoraVideoStatus(
  apiKey: string,
  jobId: string
): Promise<SoraVideoResponse> {
  console.log('[Sora] Checking video status', { jobId, mockMode: isMockMode() });

  // Use mock mode if enabled
  if (isMockMode()) {
    return mockSoraStatus(jobId);
  }

  // Real API implementation
  try {
    const response = await fetch(`https://api.openai.com/v1/video/generations/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        response: {
          status: response.status,
          data: errorData
        },
        message: errorData.error?.message || response.statusText
      };
    }

    const data = await response.json();

    // Validate response structure
    if (!data || (typeof data !== 'object')) {
      throw new Error('Invalid response format from Sora status API');
    }

    if (!data.status || typeof data.status !== 'string') {
      throw new Error('Invalid or missing status in Sora API response');
    }

    const result: SoraVideoResponse = {
      id: jobId,
      status: mapSoraStatus(data.status),
      videoUrl: data.video_url || data.output?.url,
      thumbnailUrl: data.thumbnail_url || data.output?.thumbnail,
      error: data.error?.message
    };

    console.log('[Sora] Status check result', { jobId, status: result.status });

    return result;
  } catch (error: any) {
    const wrappedError = handleSoraError(error);
    logError(wrappedError, { jobId });
    throw wrappedError;
  }
}

/**
 * Calculate Sora video cost based on model and duration
 */
export function calculateSoraCost(model: 'sora-2' | 'sora-2-pro', seconds: number): number {
  const pricePerSecond = model === 'sora-2-pro' ? 0.20 : 0.10;
  return seconds * pricePerSecond;
}

/**
 * Map Sora API status to our internal status
 */
function mapSoraStatus(soraStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
  const statusMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
    'queued': 'queued',
    'processing': 'processing',
    'completed': 'completed',
    'failed': 'failed',
    'pending': 'queued'
  };

  return statusMap[soraStatus] || 'queued';
}

/**
 * Validate Sora API key
 */
export async function validateSoraApiKey(apiKey: string): Promise<boolean> {
  // Mock mode always validates
  if (isMockMode()) {
    console.log('[Sora] Mock mode: API key validation skipped');
    return true;
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Test the API key with a simple request
    await openai.models.list();

    console.log('[Sora] API key validated successfully');
    return true;
  } catch (error) {
    console.error('[Sora] API key validation failed:', error);
    return false;
  }
}

/**
 * Map size to orientation for Sora API
 */
function mapSizeToOrientation(size: string): string {
  const sizeMap: Record<string, string> = {
    '1280x720': 'landscape',
    '720x1280': 'portrait',
    '1792x1024': 'landscape',
    '1024x1792': 'portrait'
  };
  return sizeMap[size] || 'landscape';
}

/**
 * Mock implementation for development/testing
 * Simulates video generation completing after 10 seconds
 */
function mockSoraGeneration(request: SoraGenerateRequest): { jobId: string } {
  const jobId = `mock-sora-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  mockJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    startTime: Date.now(),
    prompt: request.prompt,
    model: request.model
  });

  console.log('[Sora Mock] Job created', { jobId, model: request.model });

  // Simulate status progression
  setTimeout(() => {
    const job = mockJobs.get(jobId);
    if (job) {
      job.status = 'processing';
      mockJobs.set(jobId, job);
      console.log('[Sora Mock] Job processing', { jobId });
    }
  }, 2000);

  setTimeout(() => {
    const job = mockJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      mockJobs.set(jobId, job);
      console.log('[Sora Mock] Job completed', { jobId });
    }
  }, 10000);

  return { jobId };
}

/**
 * Mock status check for development/testing
 */
function mockSoraStatus(jobId: string): SoraVideoResponse {
  const job = mockJobs.get(jobId);

  if (!job) {
    console.warn('[Sora Mock] Job not found', { jobId });
    return {
      id: jobId,
      status: 'failed',
      error: 'Job not found'
    };
  }

  const elapsed = Date.now() - job.startTime;

  // Return completed status with mock video URL after 10 seconds
  if (job.status === 'completed') {
    return {
      id: jobId,
      status: 'completed',
      videoUrl: `https://mock-sora-videos.example.com/${jobId}.mp4`,
      thumbnailUrl: `https://mock-sora-videos.example.com/${jobId}-thumb.jpg`
    };
  }

  return {
    id: jobId,
    status: job.status,
  };
}
