import { prisma } from '@/lib/db';
import { encryptApiKey, decryptApiKey, hashApiKey } from '@/lib/encryption';
import { VideoProvider } from '@/lib/types';

/**
 * Repository for UserApiKey CRUD operations
 * Implements secure storage and retrieval of encrypted API keys
 */

export interface StoredApiKey {
  id: string;
  userId: string;
  provider: VideoProvider;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * Store an API key for a user (encrypted)
 */
export async function storeApiKey(
  userId: string,
  provider: VideoProvider,
  apiKey: string
): Promise<StoredApiKey> {
  // Encrypt the API key
  const encryptedKey = await encryptApiKey(apiKey);
  const keyHash = hashApiKey(apiKey);

  // Upsert (insert or update if exists)
  const storedKey = await prisma.userApiKey.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    update: {
      encryptedKey,
      keyHash,
      isActive: true,
    },
    create: {
      userId,
      provider,
      encryptedKey,
      keyHash,
      isActive: true,
    },
  });

  return convertPrismaApiKeyToType(storedKey);
}

/**
 * Get and decrypt an API key for a user
 */
export async function getApiKey(
  userId: string,
  provider: VideoProvider
): Promise<string | null> {
  const storedKey = await prisma.userApiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });

  if (!storedKey || !storedKey.isActive) {
    return null;
  }

  // Update last used timestamp
  await updateApiKeyLastUsed(storedKey.id);

  // Decrypt and return the API key
  return await decryptApiKey(storedKey.encryptedKey);
}

/**
 * Get stored API key metadata (without decrypting)
 */
export async function getApiKeyMetadata(
  userId: string,
  provider: VideoProvider
): Promise<StoredApiKey | null> {
  const storedKey = await prisma.userApiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });

  if (!storedKey) {
    return null;
  }

  return convertPrismaApiKeyToType(storedKey);
}

/**
 * Update last used timestamp for an API key
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  await prisma.userApiKey.update({
    where: { id: keyId },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Deactivate an API key (soft delete)
 */
export async function deactivateApiKey(
  userId: string,
  provider: VideoProvider
): Promise<void> {
  await prisma.userApiKey.update({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    data: {
      isActive: false,
    },
  });
}

/**
 * Permanently delete an API key
 */
export async function deleteApiKey(
  userId: string,
  provider: VideoProvider
): Promise<void> {
  await prisma.userApiKey.delete({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });
}

/**
 * Get all API keys for a user (metadata only, no decryption)
 */
export async function getUserApiKeys(userId: string): Promise<StoredApiKey[]> {
  const keys = await prisma.userApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map(convertPrismaApiKeyToType);
}

/**
 * Check if user has an active API key for a provider
 */
export async function hasActiveApiKey(
  userId: string,
  provider: VideoProvider
): Promise<boolean> {
  const count = await prisma.userApiKey.count({
    where: {
      userId,
      provider,
      isActive: true,
    },
  });

  return count > 0;
}

/**
 * Verify an API key matches the stored hash (without decrypting)
 */
export async function verifyApiKey(
  userId: string,
  provider: VideoProvider,
  apiKey: string
): Promise<boolean> {
  const storedKey = await prisma.userApiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });

  if (!storedKey || !storedKey.isActive) {
    return false;
  }

  const keyHash = hashApiKey(apiKey);
  return keyHash === storedKey.keyHash;
}

/**
 * Clean up inactive API keys older than specified days
 */
export async function cleanupInactiveApiKeys(
  daysOld: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.userApiKey.deleteMany({
    where: {
      isActive: false,
      lastUsedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get API key statistics
 */
export async function getApiKeyStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  bySoraProvider: number;
  byVeoProvider: number;
}> {
  const [total, active, inactive, sora, veo] = await Promise.all([
    prisma.userApiKey.count(),
    prisma.userApiKey.count({ where: { isActive: true } }),
    prisma.userApiKey.count({ where: { isActive: false } }),
    prisma.userApiKey.count({ where: { provider: 'sora', isActive: true } }),
    prisma.userApiKey.count({ where: { provider: 'veo', isActive: true } }),
  ]);

  return {
    total,
    active,
    inactive,
    bySoraProvider: sora,
    byVeoProvider: veo,
  };
}

/**
 * Helper function to convert Prisma UserApiKey to StoredApiKey type
 */
function convertPrismaApiKeyToType(key: any): StoredApiKey {
  return {
    id: key.id,
    userId: key.userId,
    provider: key.provider as VideoProvider,
    isActive: key.isActive,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt || undefined,
  };
}
