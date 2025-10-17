import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { makeSoraPrompt } from '@/lib/soraPrompt';
import { calculateSoraCost } from '@/lib/integrations/sora';
import { calculateVeoCost } from '@/lib/integrations/veo';
import { addVideoGenerationJob } from '@/lib/queue';
import { validateRequest, videoGenerateRequestSchema } from '@/lib/validation';
import { getApiKeyFromSession } from '@/app/api/auth/session/route';
import { applyRateLimit, videoGenerationLimiter, createRateLimitHeaders, getRateLimitIdentifier, checkRateLimit } from '@/lib/ratelimit';
import { createVideoJob, updateVideoJob } from '@/lib/repositories/videoJobs';
import { createSession } from '@/lib/apiKeySession';

/**
 * POST /api/video/generate
 * Generate a video for a scene using session-based authentication
 * API key is retrieved from HTTP-only cookie, not from request body
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, videoGenerationLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(videoGenerateRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { storyboardId, sceneIds, provider, model, scene, character, presetKey } = validation.data;

    // Retrieve API key from secure session cookie
    const apiKey = await getApiKeyFromSession(request, provider);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found in session. Please set up your API key first.' },
        { status: 401 }
      );
    }

    // Generate prompt
    const prompt = makeSoraPrompt(scene, character, presetKey);

    // Calculate estimated cost
    const cost = provider === 'sora'
      ? calculateSoraCost(model as 'sora-2' | 'sora-2-pro', scene.duration)
      : calculateVeoCost(scene.duration);

    // Create job ID
    const jobId = uuidv4();

    // Create job in database
    await createVideoJob({
      id: jobId,
      storyboardId,
      sceneId: scene.id,
      provider,
      prompt,
    });

    // Create session token to store API key securely (not in Redis/job data)
    const projectId = provider === 'veo' ? process.env.GOOGLE_CLOUD_PROJECT_ID : undefined;
    const sessionToken = createSession(apiKey, provider, projectId);

    // Add job to queue with error handling
    try {
      await addVideoGenerationJob({
        jobId,
        storyboardId,
        sceneId: scene.id,
        provider,
        prompt,
        sessionToken, // Use session token instead of raw API key
        model,
        size: provider === 'sora' ? '1280x720' : undefined,
        resolution: provider === 'veo' ? '720p' : undefined,
        duration: scene.duration
      });
    } catch (queueError: any) {
      // Queue operation failed - mark job as failed in database
      await updateVideoJob(jobId, {
        status: 'failed',
        errorMessage: 'Failed to queue job for processing',
      });
      throw new Error('Failed to queue job for processing. Please try again.');
    }

    // Get rate limit info for headers
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, videoGenerationLimiter);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    return NextResponse.json(
      {
        success: true,
        jobId,
        prompt,
        estimatedCost: cost,
        status: 'queued',
      },
      {
        headers: rateLimitHeaders,
      }
    );

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate video' },
      { status: 500 }
    );
  }
}
