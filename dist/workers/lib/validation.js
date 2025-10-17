"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobIdParamsSchema = exports.sessionProviderQuerySchema = exports.sessionCreateRequestSchema = exports.videoGenerateRequestSchema = exports.characterProfileSchema = exports.sceneSchema = exports.videoProviderSchema = void 0;
exports.validateRequest = validateRequest;
exports.validationError = validationError;
const zod_1 = require("zod");
/**
 * Validation schemas for API requests using Zod
 * Ensures type safety and proper input validation across all API routes
 */
// Video provider validation
exports.videoProviderSchema = zod_1.z.enum(['sora', 'veo']);
// Scene validation schema
exports.sceneSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    subject: zod_1.z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
    action: zod_1.z.string().min(1, 'Action is required').max(1000, 'Action too long'),
    duration: zod_1.z.union([zod_1.z.literal(4), zod_1.z.literal(8), zod_1.z.literal(12)]),
    imageDataUrl: zod_1.z.string().nullable().optional(),
    videoJob: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']),
        provider: exports.videoProviderSchema,
        progress: zod_1.z.number().min(0).max(100).optional(),
        videoUrl: zod_1.z.string().url().optional(),
        thumbnailUrl: zod_1.z.string().url().optional(),
        errorMessage: zod_1.z.string().optional(),
        cost: zod_1.z.number().positive().optional(),
    }).optional(),
});
// Character profile validation schema
exports.characterProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, 'Character name is required').max(100, 'Name too long'),
    age: zod_1.z.number().positive().max(150).optional(),
    gender: zod_1.z.string().max(50).optional(),
    ethnicity: zod_1.z.string().max(100).optional(),
    physique: zod_1.z.string().max(200).optional(),
    face: zod_1.z.string().max(200).optional(),
    hair: zod_1.z.string().max(200).optional(),
    clothing: zod_1.z.string().max(300).optional(),
    signature_item: zod_1.z.string().max(200).optional(),
    tone: zod_1.z.string().max(200).optional(),
    continuity_reference: zod_1.z.string().max(500).optional(),
    identity_tag: zod_1.z.string().max(200).optional(),
    imageDataUrl: zod_1.z.string().nullable().optional(),
});
// Video generation request validation
exports.videoGenerateRequestSchema = zod_1.z.object({
    storyboardId: zod_1.z.string().uuid(),
    sceneIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    provider: exports.videoProviderSchema,
    model: zod_1.z.string().min(1),
    scene: exports.sceneSchema,
    character: exports.characterProfileSchema,
    presetKey: zod_1.z.string().min(1, 'Preset key is required'),
});
// Session creation request validation
exports.sessionCreateRequestSchema = zod_1.z.object({
    provider: exports.videoProviderSchema,
    apiKey: zod_1.z.string().min(10, 'API key is too short').max(500, 'API key is too long'),
});
// Session provider query validation
exports.sessionProviderQuerySchema = zod_1.z.object({
    provider: exports.videoProviderSchema,
});
// Job ID params validation
exports.jobIdParamsSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid('Invalid job ID format'),
});
/**
 * Helper function to validate request body and return typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or error
 */
function validateRequest(schema, data) {
    try {
        const validData = schema.parse(data);
        return { success: true, data: validData };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            // Format validation errors into a readable message
            const firstIssue = error.issues[0];
            const errorMessage = firstIssue
                ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
                : 'Validation failed';
            return {
                success: false,
                error: errorMessage,
                issues: error.issues,
            };
        }
        return {
            success: false,
            error: 'Validation failed with unknown error',
        };
    }
}
/**
 * Helper to create error responses for validation failures
 */
function validationError(message, issues) {
    return {
        error: message,
        ...(issues && { details: issues }),
    };
}
//# sourceMappingURL=validation.js.map