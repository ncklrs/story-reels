import { put, del } from '@vercel/blob';

/**
 * Video storage utilities using Vercel Blob
 */

export interface UploadVideoOptions {
  filename: string;
  contentType?: string;
  addRandomSuffix?: boolean;
}

/**
 * Upload video to blob storage
 */
export async function uploadVideo(
  videoBuffer: Buffer | Blob,
  options: UploadVideoOptions
): Promise<{ url: string; downloadUrl: string }> {
  try {
    const blob = await put(options.filename, videoBuffer, {
      access: 'public',
      contentType: options.contentType || 'video/mp4',
      addRandomSuffix: options.addRandomSuffix ?? true
    });

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl
    };
  } catch (error: any) {
    throw new Error(`Video upload failed: ${error.message}`);
  }
}

/**
 * Delete video from blob storage
 */
export async function deleteVideo(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error: any) {
    throw new Error(`Video deletion failed: ${error.message}`);
  }
}

/**
 * Download video from URL to buffer
 */
export async function downloadVideo(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    throw new Error(`Video download failed: ${error.message}`);
  }
}

/**
 * Get video file size in bytes
 */
export async function getVideoFileSize(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch (error: any) {
    throw new Error(`Failed to get file size: ${error.message}`);
  }
}
