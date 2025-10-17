import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStoryboard,
  getStoryboards,
  searchStoryboards,
  getUserStoryboards,
} from '@/lib/repositories/storyboards';
import { characterProfileSchema, sceneSchema, validateRequest } from '@/lib/validation';
import { applyRateLimit, generalLimiter } from '@/lib/ratelimit';

/**
 * Validation schema for creating a storyboard
 */
const createStoryboardSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  presetKey: z.string().min(1, 'Preset key is required'),
  character: characterProfileSchema,
  scenes: z.array(sceneSchema),
});

/**
 * GET /api/storyboards
 * List storyboards with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate pagination params
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    let storyboards;

    // Search query takes precedence
    if (search) {
      storyboards = await searchStoryboards(search, userId || undefined);
    } else if (userId) {
      storyboards = await getUserStoryboards(userId, limit);
    } else {
      storyboards = await getStoryboards({
        limit,
        offset,
      });
    }

    return NextResponse.json({
      success: true,
      storyboards,
      count: storyboards.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Get storyboards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get storyboards' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storyboards
 * Create a new storyboard
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, generalLimiter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(createStoryboardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.issues },
        { status: 400 }
      );
    }

    const { userId, name, presetKey, character, scenes } = validation.data;

    // Create storyboard in database
    const storyboard = await createStoryboard({
      userId,
      name,
      presetKey,
      character,
      scenes,
    });

    return NextResponse.json(
      {
        success: true,
        storyboard,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create storyboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create storyboard' },
      { status: 500 }
    );
  }
}
