import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue';
import { getSoraVideoStatus } from '@/lib/integrations/sora';
import { getVeoVideoStatus } from '@/lib/integrations/veo';
import { uploadVideo } from '@/lib/storage';
import { validateRequest, jobIdParamsSchema } from '@/lib/validation';
import { getVideoJob, updateVideoJob } from '@/lib/repositories/videoJobs';

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
      const { provider, providerJobId, apiKey } = job.data;

        // If job is still processing, poll provider
        if (job.state === 'active' || job.state === 'waiting') {
          if (providerJobId) {
            let providerStatus;

            if (provider === 'sora') {
              providerStatus = await getSoraVideoStatus(apiKey, providerJobId);
            } else {
              providerStatus = await getVeoVideoStatus(
                { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!, apiKey },
                providerJobId
              );
            }

            // If video is ready, upload to our storage and update database
            if (providerStatus.status === 'completed' && providerStatus.videoUrl) {
              const videoBuffer = await fetch(providerStatus.videoUrl).then(r => r.arrayBuffer());

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
