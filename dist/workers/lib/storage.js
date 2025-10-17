"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVideo = uploadVideo;
exports.deleteVideo = deleteVideo;
exports.downloadVideo = downloadVideo;
exports.getVideoFileSize = getVideoFileSize;
const blob_1 = require("@vercel/blob");
/**
 * Upload video to blob storage
 */
async function uploadVideo(videoBuffer, options) {
    try {
        const blob = await (0, blob_1.put)(options.filename, videoBuffer, {
            access: 'public',
            contentType: options.contentType || 'video/mp4',
            addRandomSuffix: options.addRandomSuffix ?? true
        });
        return {
            url: blob.url,
            downloadUrl: blob.downloadUrl
        };
    }
    catch (error) {
        throw new Error(`Video upload failed: ${error.message}`);
    }
}
/**
 * Delete video from blob storage
 */
async function deleteVideo(url) {
    try {
        await (0, blob_1.del)(url);
    }
    catch (error) {
        throw new Error(`Video deletion failed: ${error.message}`);
    }
}
/**
 * Download video from URL to buffer
 */
async function downloadVideo(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    catch (error) {
        throw new Error(`Video download failed: ${error.message}`);
    }
}
/**
 * Get video file size in bytes
 */
async function getVideoFileSize(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
    }
    catch (error) {
        throw new Error(`Failed to get file size: ${error.message}`);
    }
}
//# sourceMappingURL=storage.js.map