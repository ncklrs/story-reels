import { VertexAI } from '@google-cloud/vertexai';
import { VeoGenerateRequest, GoogleCredentials } from '../types';
import { handleVeoError, retryWithBackoff, logError, VideoGenerationError } from './errors';

/**
 * Veo 3.1 API Integration
 * Documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 *
 * Note: Veo 3.1 is available via Google Cloud Vertex AI. This implementation
 * includes both real API calls and mock fallback for development/testing.
 *
 * Environment variables:
 * - VEO_MOCK_MODE: Set to 'true' to use mock responses (development/testing)
 * - GOOGLE_CLOUD_PROJECT_ID: Your GCP project ID
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON (optional, for auth)
 */

/**
 * API request timeout in milliseconds (60 seconds)
 * Prevents requests from hanging indefinitely
 */
const API_TIMEOUT_MS = 60000;

export interface VeoVideoResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Mock job storage for development mode
 */
const mockVeoJobs = new Map<string, {
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
function cleanupOldMockVeoJobs(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  let cleanedCount = 0;

  for (const [jobId, job] of mockVeoJobs.entries()) {
    if (now - job.startTime > maxAge) {
      mockVeoJobs.delete(jobId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log('[Veo Mock] Cleaned up old jobs', {
      count: cleanedCount,
      remaining: mockVeoJobs.size
    });
  }
}

/**
 * Initialize cleanup interval for mock jobs
 * Only runs in server environment and mock mode
 */
let mockVeoCleanupInterval: NodeJS.Timeout | null = null;

function initMockVeoJobCleanup(): void {
  // Don't start cleanup if not in mock mode or in browser
  if (typeof window !== 'undefined' || !isVeoMockMode()) {
    return;
  }

  if (mockVeoCleanupInterval) {
    return;
  }

  mockVeoCleanupInterval = setInterval(() => {
    cleanupOldMockVeoJobs();
  }, 60000); // Run every minute

  console.log('[Veo Mock] Cleanup interval initialized');
}

// Auto-initialize cleanup on server startup in mock mode
if (typeof window === 'undefined' && isVeoMockMode()) {
  initMockVeoJobCleanup();
}

/**
 * Check if mock mode is enabled
 */
function isVeoMockMode(): boolean {
  return process.env.VEO_MOCK_MODE === 'true';
}

/**
 * Initialize Veo video generation
 */
export async function generateVeoVideo(
  credentials: GoogleCredentials,
  request: VeoGenerateRequest
): Promise<{ jobId: string }> {
  console.log('[Veo] Starting video generation', {
    model: request.model,
    duration: request.duration,
    resolution: request.resolution,
    mockMode: isVeoMockMode()
  });

  // Use mock mode if enabled
  if (isVeoMockMode()) {
    return mockVeoGeneration(request);
  }

  // Real API implementation with retry logic
  try {
    return await retryWithBackoff(
      async () => {
        try {
          const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

          // Veo 3.1 uses a long-running operation pattern
          // POST https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:predictLongRunning
          const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${credentials.projectId}/locations/${location}/publishers/google/models/${request.model}:predictLongRunning`;

          const requestBody = {
            instances: [
              {
                prompt: request.prompt,
                ...(request.reference_images && request.reference_images.length > 0 && {
                  referenceImages: request.reference_images.slice(0, 3).map(img => ({
                    bytesBase64Encoded: img
                  }))
                })
              }
            ],
            parameters: {
              durationSeconds: request.duration,
              aspectRatio: mapResolutionToAspectRatio(request.resolution),
              generateAudio: true,
              resolution: request.resolution,
              sampleCount: 1
            }
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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
            throw new Error('Invalid response format from Veo API');
          }

          // Extract operation name (job ID) from response
          const operationName = data.name;
          if (!operationName || typeof operationName !== 'string') {
            throw new Error('No valid operation name returned from Veo API');
          }

          // Extract operation ID from full operation name
          // Format: projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID/operations/OPERATION_ID
          const operationId = operationName.split('/operations/')[1] || operationName;

          console.log('[Veo] Video generation initiated', { operationId });

          return { jobId: operationId };
        } catch (error: any) {
          throw handleVeoError(error);
        }
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (error, retryCount) => {
          console.warn(`[Veo] Retry attempt ${retryCount + 1} after error:`, error.message);
        }
      }
    );
  } catch (error: any) {
    if (error instanceof VideoGenerationError) {
      logError(error, { request });
      throw error;
    }
    const wrappedError = handleVeoError(error);
    logError(wrappedError, { request });
    throw wrappedError;
  }
}

/**
 * Poll Veo video status
 */
export async function getVeoVideoStatus(
  credentials: GoogleCredentials,
  jobId: string,
  model?: string // Optional model parameter - uses the actual model used for generation
): Promise<VeoVideoResponse> {
  console.log('[Veo] Checking video status', { jobId, model, mockMode: isVeoMockMode() });

  // Use mock mode if enabled
  if (isVeoMockMode()) {
    return mockVeoStatus(jobId);
  }

  // Real API implementation
  try {
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    const modelId = model || 'veo-3.1-generate-preview'; // Use provided model or default

    // Fetch operation status using fetchPredictOperation
    // POST https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:fetchPredictOperation
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${credentials.projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operationId: jobId
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
      throw new Error('Invalid response format from Veo status API');
    }

    // Validate that done field exists (should be boolean)
    if (typeof data.done !== 'boolean') {
      throw new Error('Invalid or missing done field in Veo API response');
    }

    // Parse response based on operation status
    const isDone = data.done === true;
    const hasError = !!data.error;

    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    if (isDone && !hasError && data.response) {
      // Extract video URLs from response
      const videos = data.response.videos || [];
      if (videos.length > 0) {
        videoUrl = videos[0].gcsUri || videos[0].url;
      }

      // Check for RAI (Responsible AI) filtering
      const raiMediaFilteredReasons = data.response.raiMediaFilteredReasons || [];
      if (raiMediaFilteredReasons.length > 0) {
        console.warn('[Veo] Content filtered by RAI:', raiMediaFilteredReasons);
      }
    }

    const result: VeoVideoResponse = {
      id: jobId,
      status: mapVeoStatus(isDone, hasError ? data.error : undefined),
      videoUrl,
      thumbnailUrl,
      error: data.error?.message
    };

    console.log('[Veo] Status check result', { jobId, status: result.status });

    return result;
  } catch (error: any) {
    const wrappedError = handleVeoError(error);
    logError(wrappedError, { jobId });
    throw wrappedError;
  }
}

/**
 * Calculate Veo video cost based on duration
 * Approximate: $0.15 per 10 seconds
 */
export function calculateVeoCost(seconds: number): number {
  return (seconds / 10) * 0.15;
}

/**
 * Map Veo API status to our internal status
 */
function mapVeoStatus(
  done: boolean,
  error?: any
): 'queued' | 'processing' | 'completed' | 'failed' {
  if (error) return 'failed';
  if (done) return 'completed';
  return 'processing';
}

/**
 * Validate Veo API credentials
 */
export async function validateVeoCredentials(credentials: GoogleCredentials): Promise<boolean> {
  // Mock mode always validates
  if (isVeoMockMode()) {
    console.log('[Veo] Mock mode: Credentials validation skipped');
    return true;
  }

  try {
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

    // Try to list models to validate credentials
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${credentials.projectId}/locations/${location}/publishers/google/models`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });

    const isValid = response.ok;

    if (isValid) {
      console.log('[Veo] Credentials validated successfully');
    } else {
      console.error('[Veo] Credentials validation failed:', response.statusText);
    }

    return isValid;
  } catch (error) {
    console.error('[Veo] Credentials validation error:', error);
    return false;
  }
}

/**
 * Convert Sora prompt to Veo-compatible format
 * Veo may have different prompt requirements than Sora
 */
export function adaptPromptForVeo(soraPrompt: string): string {
  // Remove Sora-specific formatting
  let veoPrompt = soraPrompt
    .replace(/Style:/gi, '')
    .replace(/Subject:/gi, '')
    .replace(/Action:/gi, '')
    .replace(/Camera:/gi, '')
    .replace(/Lighting:/gi, '')
    .replace(/Palette:/gi, '')
    .replace(/Sound:/gi, '')
    .replace(/Duration:.*seconds\./gi, '')
    .trim();

  // Clean up extra spaces and periods
  veoPrompt = veoPrompt.replace(/\s+/g, ' ').replace(/\.+/g, '. ').trim();

  return veoPrompt;
}

/**
 * Map resolution to aspect ratio for Veo API
 */
function mapResolutionToAspectRatio(resolution: string): string {
  return resolution === '1080p' || resolution === '720p' ? '16:9' : '16:9';
}

/**
 * Mock implementation for development/testing
 * Simulates video generation completing after 10 seconds
 */
function mockVeoGeneration(request: VeoGenerateRequest): { jobId: string } {
  const jobId = `mock-veo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  mockVeoJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    startTime: Date.now(),
    prompt: request.prompt,
    model: request.model
  });

  console.log('[Veo Mock] Job created', { jobId, model: request.model });

  // Simulate status progression
  setTimeout(() => {
    const job = mockVeoJobs.get(jobId);
    if (job) {
      job.status = 'processing';
      mockVeoJobs.set(jobId, job);
      console.log('[Veo Mock] Job processing', { jobId });
    }
  }, 2000);

  setTimeout(() => {
    const job = mockVeoJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      mockVeoJobs.set(jobId, job);
      console.log('[Veo Mock] Job completed', { jobId });
    }
  }, 10000);

  return { jobId };
}

/**
 * Mock status check for development/testing
 */
function mockVeoStatus(jobId: string): VeoVideoResponse {
  const job = mockVeoJobs.get(jobId);

  if (!job) {
    console.warn('[Veo Mock] Job not found', { jobId });
    return {
      id: jobId,
      status: 'failed',
      error: 'Job not found'
    };
  }

  // Return completed status with mock video URL after 10 seconds
  if (job.status === 'completed') {
    return {
      id: jobId,
      status: 'completed',
      videoUrl: `https://mock-veo-videos.example.com/${jobId}.mp4`,
      thumbnailUrl: `https://mock-veo-videos.example.com/${jobId}-thumb.jpg`
    };
  }

  return {
    id: jobId,
    status: job.status,
  };
}
