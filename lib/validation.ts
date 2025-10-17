import { z } from 'zod';

/**
 * Validation schemas for API requests using Zod
 * Ensures type safety and proper input validation across all API routes
 */

// Video provider validation
export const videoProviderSchema = z.enum(['sora', 'veo']);

// Scene validation schema
export const sceneSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  action: z.string().min(1, 'Action is required').max(1000, 'Action too long'),
  duration: z.union([z.literal(4), z.literal(8), z.literal(12)]),
  imageDataUrl: z.string().nullable().optional(),
  videoJob: z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    provider: videoProviderSchema,
    progress: z.number().min(0).max(100).optional(),
    videoUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    errorMessage: z.string().optional(),
    cost: z.number().positive().optional(),
  }).optional(),
});

// Character profile validation schema
export const characterProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Character name is required').max(100, 'Name too long'),
  age: z.number().positive().max(150).optional(),
  gender: z.string().max(50).optional(),
  ethnicity: z.string().max(100).optional(),
  physique: z.string().max(200).optional(),
  face: z.string().max(200).optional(),
  hair: z.string().max(200).optional(),
  clothing: z.string().max(300).optional(),
  signature_item: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
  continuity_reference: z.string().max(500).optional(),
  identity_tag: z.string().max(200).optional(),
  imageDataUrl: z.string().nullable().optional(),
});

// Video generation request validation
export const videoGenerateRequestSchema = z.object({
  storyboardId: z.string().uuid(),
  sceneIds: z.array(z.string().uuid()).optional(),
  provider: videoProviderSchema,
  model: z.string().min(1),
  scene: sceneSchema,
  character: characterProfileSchema,
  presetKey: z.string().min(1, 'Preset key is required'),
});

// Session creation request validation
export const sessionCreateRequestSchema = z.object({
  provider: videoProviderSchema,
  apiKey: z.string().min(10, 'API key is too short').max(500, 'API key is too long'),
});

// Session provider query validation
export const sessionProviderQuerySchema = z.object({
  provider: videoProviderSchema,
});

// Job ID params validation
export const jobIdParamsSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

/**
 * Helper function to validate request body and return typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or error
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; issues?: z.ZodIssue[] } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function validationError(message: string, issues?: z.ZodIssue[]) {
  return {
    error: message,
    ...(issues && { details: issues }),
  };
}
