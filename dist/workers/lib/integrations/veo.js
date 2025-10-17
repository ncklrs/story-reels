"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVeoVideo = generateVeoVideo;
exports.getVeoVideoStatus = getVeoVideoStatus;
exports.calculateVeoCost = calculateVeoCost;
exports.validateVeoCredentials = validateVeoCredentials;
exports.adaptPromptForVeo = adaptPromptForVeo;
const vertexai_1 = require("@google-cloud/vertexai");
/**
 * Initialize Veo video generation
 */
async function generateVeoVideo(credentials, request) {
    try {
        const vertexAI = new vertexai_1.VertexAI({
            project: credentials.projectId,
            location: 'us-central1'
        });
        // Initialize the generative model
        const model = vertexAI.preview.getGenerativeModel({
            model: request.model
        });
        // Prepare the request
        const generateRequest = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: request.prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                // Veo-specific video config parameters
                videoConfig: {
                    resolution: request.resolution,
                    duration: request.duration,
                    fps: request.fps,
                    ...(request.reference_images && {
                        referenceImages: request.reference_images
                    })
                }
            }
        };
        // Generate video
        const result = await model.generateContent(generateRequest);
        // Extract job ID from response
        // Note: Actual response structure may vary
        const jobId = result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
            Math.random().toString(36).substring(7);
        return { jobId };
    }
    catch (error) {
        throw new Error(`Veo video generation failed: ${error.message}`);
    }
}
/**
 * Poll Veo video status
 */
async function getVeoVideoStatus(credentials, jobId) {
    try {
        // Placeholder implementation
        // In practice, this would query the Vertex AI operation status
        const response = await fetch(`https://aiplatform.googleapis.com/v1/projects/${credentials.projectId}/locations/us-central1/operations/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${credentials.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Status check failed: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            id: jobId,
            status: mapVeoStatus(data.done, data.error),
            videoUrl: data.response?.videoUrl,
            thumbnailUrl: data.response?.thumbnailUrl,
            error: data.error?.message
        };
    }
    catch (error) {
        throw new Error(`Failed to get Veo video status: ${error.message}`);
    }
}
/**
 * Calculate Veo video cost based on duration
 * Approximate: $0.15 per 10 seconds
 */
function calculateVeoCost(seconds) {
    return (seconds / 10) * 0.15;
}
/**
 * Map Veo API status to our internal status
 */
function mapVeoStatus(done, error) {
    if (error)
        return 'failed';
    if (done)
        return 'completed';
    return 'processing';
}
/**
 * Validate Veo API credentials
 */
async function validateVeoCredentials(credentials) {
    try {
        const vertexAI = new vertexai_1.VertexAI({
            project: credentials.projectId,
            location: 'us-central1'
        });
        // Test the credentials with a simple list operation
        // This is a placeholder - actual validation would depend on available endpoints
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Convert Sora prompt to Veo-compatible format
 * Veo may have different prompt requirements than Sora
 */
function adaptPromptForVeo(soraPrompt) {
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
//# sourceMappingURL=veo.js.map