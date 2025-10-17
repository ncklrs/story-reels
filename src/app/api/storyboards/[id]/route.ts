import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getStoryboard,
  getStoryboardWithJobs,
  updateStoryboard,
  deleteStoryboard,
} from '@/lib/repositories/storyboards';
import { characterProfileSchema, sceneSchema, validateRequest } from '@/lib/validation';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

/**
 * Validation schema for storyboard ID
 */
const storyboardIdSchema = z.object({
  id: z.string().uuid('Invalid storyboard ID'),
});

/**
 * Validation schema for updating a storyboard
 */
const updateStoryboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  presetKey: z.string().min(1).optional(),
  character: characterProfileSchema.optional(),
  scenes: z.array(sceneSchema).optional(),
});

/**
 * GET /api/storyboards/[id]
 * Get a single storyboard with optional video jobs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const awaitedParams = await params;

    // Validate ID
    const validation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { id } = validation.data;
    const { searchParams } = new URL(request.url);
    const includeJobs = searchParams.get('includeJobs') === 'true';

    let storyboard;

    if (includeJobs) {
      storyboard = await getStoryboardWithJobs(id);
    } else {
      storyboard = await getStoryboard(id);
    }

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      storyboard,
    });
  } catch (error: any) {
    console.error('Get storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get storyboard' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/storyboards/[id]
 * Update a storyboard
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const awaitedParams = await params;

    // Validate ID
    const idValidation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: idValidation.error, details: idValidation.issues },
        { status: 400 }
      );
    }

    const { id } = idValidation.data;

    // Check if storyboard exists
    const existingStoryboard = await getStoryboard(id);
    if (!existingStoryboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(updateStoryboardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }

    // Update storyboard
    const storyboard = await updateStoryboard(id, updateData);

    return NextResponse.json({
      success: true,
      storyboard,
    });
  } catch (error: any) {
    console.error('Update storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update storyboard' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storyboards/[id]
 * Delete a storyboard (cascade deletes video jobs)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const awaitedParams = await params;

    // Validate ID
    const validation = validateRequest(storyboardIdSchema, awaitedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // Check if storyboard exists
    const existingStoryboard = await getStoryboard(id);
    if (!existingStoryboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    // Delete storyboard (cascade deletes video jobs)
    await deleteStoryboard(id);

    return NextResponse.json({
      success: true,
      message: 'Storyboard deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete storyboard' },
      { status: 500 }
    );
  }
}
