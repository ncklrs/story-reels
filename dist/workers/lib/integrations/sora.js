"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSoraVideo = generateSoraVideo;
exports.getSoraVideoStatus = getSoraVideoStatus;
exports.calculateSoraCost = calculateSoraCost;
exports.validateSoraApiKey = validateSoraApiKey;
const openai_1 = __importDefault(require("openai"));
/**
 * Initialize Sora video generation
 */
async function generateSoraVideo(apiKey, request) {
    const openai = new openai_1.default({ apiKey });
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
        });
        // The actual response structure will depend on OpenAI's implementation
        // This is a placeholder for the job ID
        return {
            jobId: response.id
        };
    }
    catch (error) {
        throw new Error(`Sora video generation failed: ${error.message}`);
    }
}
/**
 * Poll Sora video status
 */
async function getSoraVideoStatus(apiKey, jobId) {
    const openai = new openai_1.default({ apiKey });
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
    }
    catch (error) {
        throw new Error(`Failed to get Sora video status: ${error.message}`);
    }
}
/**
 * Calculate Sora video cost based on model and duration
 */
function calculateSoraCost(model, seconds) {
    const pricePerSecond = model === 'sora-2-pro' ? 0.20 : 0.10;
    return seconds * pricePerSecond;
}
/**
 * Map Sora API status to our internal status
 */
function mapSoraStatus(soraStatus) {
    const statusMap = {
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
async function validateSoraApiKey(apiKey) {
    try {
        const openai = new openai_1.default({ apiKey });
        // Test the API key with a simple request
        await openai.models.list();
        return true;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=sora.js.map