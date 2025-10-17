import { NextRequest, NextResponse } from 'next/server';
import { encryptApiKey, decryptApiKey, hashApiKey } from '@/lib/encryption';

// Simple in-memory storage for demo (use database in production)
const apiKeys = new Map<string, { provider: string; encryptedKey: string; hash: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = await encryptApiKey(apiKey);
    const keyHash = hashApiKey(apiKey);

    // Store encrypted key (in production, save to database)
    apiKeys.set(provider, { provider, encryptedKey, hash: keyHash });

    return NextResponse.json({
      success: true,
      provider,
      message: 'API key stored successfully'
    });

  } catch (error: any) {
    console.error('API key storage error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store API key' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    const keyData = apiKeys.get(provider);

    if (!keyData) {
      return NextResponse.json(
        { error: 'API key not found for provider' },
        { status: 404 }
      );
    }

    // Decrypt the API key
    const decryptedKey = await decryptApiKey(keyData.encryptedKey);

    return NextResponse.json({
      provider,
      apiKey: decryptedKey
    });

  } catch (error: any) {
    console.error('API key retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    apiKeys.delete(provider);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error: any) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
