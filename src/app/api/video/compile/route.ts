import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import { validateRequest } from '@/lib/validation';
import { applyRateLimit, videoCompilationLimiter, createRateLimitHeaders, getRateLimitIdentifier, checkRateLimit } from '@/lib/ratelimit';

/**
 * Validation schema for video compilation request
 */
const compileRequestSchema = z.object({
  sceneVideoUrls: z.array(z.string().url()).min(2, 'At least 2 scenes required'),
  storyboardId: z.string().uuid(),
});

/**
 * POST /api/video/compile
 * Compile multiple scene videos into a single final video using FFmpeg
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, videoCompilationLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request
    const validation = validateRequest(compileRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { sceneVideoUrls, storyboardId } = validation.data;

    // Import FFmpeg dynamically (only on server)
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    // Initialize FFmpeg
    const ffmpeg = new FFmpeg();

    // Load FFmpeg WASM files from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('FFmpeg loaded successfully');

    // Download all scene videos
    const videoFiles: { name: string; data: Uint8Array }[] = [];
    for (let i = 0; i < sceneVideoUrls.length; i++) {
      const url = sceneVideoUrls[i];
      const fileName = `scene_${i}.mp4`;

      try {
        const data = await fetchFile(url);
        await ffmpeg.writeFile(fileName, data);
        videoFiles.push({ name: fileName, data });
        console.log(`Downloaded scene ${i + 1}/${sceneVideoUrls.length}`);
      } catch (error) {
        console.error(`Failed to download scene ${i}:`, error);
        throw new Error(`Failed to download scene video from ${url}`);
      }
    }

    // Create concat file list for FFmpeg
    const concatList = videoFiles.map(f => `file '${f.name}'`).join('\n');
    await ffmpeg.writeFile('concat_list.txt', concatList);

    // Run FFmpeg to concatenate videos
    // Using concat demuxer for lossless concatenation
    console.log('Starting video concatenation...');
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-c', 'copy', // Copy streams without re-encoding for speed
      'output.mp4'
    ]);

    console.log('Video concatenation complete');

    // Read the output file
    const outputData = await ffmpeg.readFile('output.mp4');
    // Convert FileData (Uint8Array) to Buffer for Blob creation
    const outputBuffer = Buffer.from(outputData as Uint8Array);
    const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });

    // Upload to Vercel Blob
    const compiledVideoName = `compiled-${storyboardId}-${uuidv4()}.mp4`;
    const { url: videoUrl } = await put(compiledVideoName, outputBlob, {
      access: 'public',
      contentType: 'video/mp4',
    });

    console.log('Compiled video uploaded:', videoUrl);

    // Calculate file size and duration estimate
    const fileSizeBytes = outputBlob.size;
    const durationSeconds = sceneVideoUrls.length * 8; // Rough estimate

    // Get rate limit info for headers
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, videoCompilationLimiter);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    return NextResponse.json(
      {
        success: true,
        videoUrl,
        fileSizeBytes,
        durationSeconds,
        scenesCompiled: sceneVideoUrls.length,
      },
      {
        headers: rateLimitHeaders,
      }
    );

  } catch (error: any) {
    console.error('Video compilation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to compile videos',
        details: error.stack
      },
      { status: 500 }
    );
  }
}
