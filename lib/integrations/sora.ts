import OpenAI from 'openai';
import { SoraGenerateRequest } from '../types';

/**
 * Sora 2 API Integration
 * Documentation: https://platform.openai.com/docs/guides/video-generation
 */

export interface SoraVideoResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Initialize Sora video generation
 */
export async function generateSoraVideo(
  apiKey: string,
  request: SoraGenerateRequest
): Promise<{ jobId: string }> {
  const openai = new OpenAI({ apiKey });

  try {
    // Note: As of now, OpenAI's video generation API may use a different endpoint structure
    // This is a reference implementation based on the pattern of their other APIs
    const response = await openai.chat.completions.create({
      model: request.model,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      // Sora API is not yet officially released, this is a placeholder implementation
      video: {
        size: request.size,
        duration: request.seconds,
        ...(request.image_reference && { image_reference: request.image_reference })
      }
    } as any);

    // The actual response structure will depend on OpenAI's implementation
    // This is a placeholder for the job ID
    return {
      jobId: response.id
    };
  } catch (error: any) {
    throw new Error(`Sora video generation failed: ${error.message}`);
  }
}

/**
 * Poll Sora video status
 */
export async function getSoraVideoStatus(
  apiKey: string,
  jobId: string
): Promise<SoraVideoResponse> {
  const openai = new OpenAI({ apiKey });

  try {
    // Placeholder implementation - actual endpoint may differ
    // In practice, this would hit a specific status endpoint
    const response = await fetch(`https://api.openai.com/v1/videos/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: jobId,
      status: mapSoraStatus(data.status),
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      error: data.error
    };
  } catch (error: any) {
    throw new Error(`Failed to get Sora video status: ${error.message}`);
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
  try {
    const openai = new OpenAI({ apiKey });

    // Test the API key with a simple request
    await openai.models.list();

    return true;
  } catch (error) {
    return false;
  }
}
