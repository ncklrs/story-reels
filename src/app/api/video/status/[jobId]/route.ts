import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue';
import { getSoraVideoStatus } from '@/lib/integrations/sora';
import { getVeoVideoStatus } from '@/lib/integrations/veo';
import { uploadVideo } from '@/lib/storage';
import { validateRequest, jobIdParamsSchema } from '@/lib/validation';
import { getVideoJob, updateVideoJob } from '@/lib/repositories/videoJobs';
import { getSession } from '@/lib/apiKeySession';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const awaitedParams = await params;

    // Validate jobId parameter
    const validation = validateRequest(jobIdParamsSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { jobId } = validation.data;

    // Get job from database
    const dbJob = await getVideoJob(jobId);

    if (!dbJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If job is already completed in database, return database data
    if (dbJob.status === 'completed') {
      return NextResponse.json({
        jobId,
        status: 'completed',
        videoUrl: dbJob.videoUrl,
        thumbnailUrl: dbJob.thumbnailUrl,
        cost: dbJob.cost,
        progress: 100,
      });
    }

    if (dbJob.status === 'failed') {
      return NextResponse.json({
        jobId,
        status: 'failed',
        errorMessage: dbJob.errorMessage,
        progress: 0,
      });
    }

    // Get job from queue for real-time status
    const job = await getJobStatus(jobId);

    if (job) {
      const { provider, providerJobId, sessionToken, model } = job.data;

        // If job is still processing, poll provider
        if (job.state === 'active' || job.state === 'waiting') {
          if (providerJobId) {
            // Retrieve API key from session token (not stored in job data)
            const session = getSession(sessionToken);

            if (!session) {
              console.error('[Status] Session expired or not found', { jobId, sessionToken: sessionToken?.substring(0, 8) });
              return NextResponse.json(
                { error: 'Session expired. Please regenerate the video.' },
                { status: 401 }
              );
            }

            let providerStatus;

            try {
              if (provider === 'sora') {
                providerStatus = await getSoraVideoStatus(session.apiKey, providerJobId);
              } else {
                // Validate environment variable for Veo
                const projectId = session.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;

                if (!projectId) {
                  console.error('[Status] Missing Google Cloud Project ID for Veo provider', { jobId });
                  return NextResponse.json(
                    { error: 'Google Cloud Project ID not configured. Please check server configuration.' },
                    { status: 500 }
                  );
                }

                providerStatus = await getVeoVideoStatus(
                  { projectId, apiKey: session.apiKey },
                  providerJobId,
                  model // Pass the actual model used for generation
                );
              }
            } catch (error: any) {
              console.error('[Status] Error fetching provider status', { jobId, error: error.message });
              return NextResponse.json(
                { error: `Failed to fetch video status: ${error.message}` },
                { status: 500 }
              );
            }

            // If video is ready, upload to our storage and update database
            if (providerStatus.status === 'completed' && providerStatus.videoUrl) {
              try {
                // Fetch video with timeout protection (30 seconds)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                let videoBuffer: ArrayBuffer;
                try {
                  const videoResponse = await fetch(providerStatus.videoUrl, {
                    signal: controller.signal
                  });

                  if (!videoResponse.ok) {
                    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
                  }

                  videoBuffer = await videoResponse.arrayBuffer();
                } finally {
                  clearTimeout(timeoutId);
                }

                const { url } = await uploadVideo(
                  Buffer.from(videoBuffer),
                  {
                    filename: `${jobId}.mp4`,
                    contentType: 'video/mp4'
                  }
                );

                // Update database with completed status
                await updateVideoJob(jobId, {
                  status: 'completed',
                  videoUrl: url,
                  completedAt: new Date(),
                });

                return NextResponse.json({
                  jobId,
                  status: 'completed',
                  videoUrl: url,
                  progress: 100
                });
              } catch (error: any) {
                console.error('[Status] Error uploading video', { jobId, error: error.message });

                // Determine error type
                const isTimeout = error.name === 'AbortError';
                const errorMessage = isTimeout
                  ? 'Video download timed out. The video URL may be invalid or network is slow.'
                  : `Failed to download and upload video: ${error.message}`;

                // Update job with error status
                await updateVideoJob(jobId, {
                  status: 'failed',
                  errorMessage,
                });

                return NextResponse.json({
                  jobId,
                  status: 'failed',
                  error: errorMessage,
                  progress: 0
                });
              }
            }

            return NextResponse.json({
              jobId,
              status: providerStatus.status,
              progress: providerStatus.status === 'processing' ? 50 : 10
            });
          }
        }

      // Return job status from queue
      return NextResponse.json({
        jobId,
        status: job.state,
        progress: typeof job.progress === 'number' ? job.progress : 0,
        error: job.failedReason
      });
    }

    // Fallback to database status (only for pending/processing jobs)
    return NextResponse.json({
      jobId,
      status: dbJob.status,
      progress: dbJob.status === 'processing' ? 50 : 0,
      videoUrl: dbJob.videoUrl,
      errorMessage: dbJob.errorMessage,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
