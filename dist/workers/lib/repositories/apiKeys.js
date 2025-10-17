"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeApiKey = storeApiKey;
exports.getApiKey = getApiKey;
exports.getApiKeyMetadata = getApiKeyMetadata;
exports.updateApiKeyLastUsed = updateApiKeyLastUsed;
exports.deactivateApiKey = deactivateApiKey;
exports.deleteApiKey = deleteApiKey;
exports.getUserApiKeys = getUserApiKeys;
exports.hasActiveApiKey = hasActiveApiKey;
exports.verifyApiKey = verifyApiKey;
exports.cleanupInactiveApiKeys = cleanupInactiveApiKeys;
exports.getApiKeyStats = getApiKeyStats;
const db_1 = require("@/lib/db");
const encryption_1 = require("@/lib/encryption");
/**
 * Store an API key for a user (encrypted)
 */
async function storeApiKey(userId, provider, apiKey) {
    // Encrypt the API key
    const encryptedKey = await (0, encryption_1.encryptApiKey)(apiKey);
    const keyHash = (0, encryption_1.hashApiKey)(apiKey);
    // Upsert (insert or update if exists)
    const storedKey = await db_1.prisma.userApiKey.upsert({
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
async function getApiKey(userId, provider) {
    const storedKey = await db_1.prisma.userApiKey.findUnique({
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
    return await (0, encryption_1.decryptApiKey)(storedKey.encryptedKey);
}
/**
 * Get stored API key metadata (without decrypting)
 */
async function getApiKeyMetadata(userId, provider) {
    const storedKey = await db_1.prisma.userApiKey.findUnique({
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
async function updateApiKeyLastUsed(keyId) {
    await db_1.prisma.userApiKey.update({
        where: { id: keyId },
        data: {
            lastUsedAt: new Date(),
        },
    });
}
/**
 * Deactivate an API key (soft delete)
 */
async function deactivateApiKey(userId, provider) {
    await db_1.prisma.userApiKey.update({
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
async function deleteApiKey(userId, provider) {
    await db_1.prisma.userApiKey.delete({
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
async function getUserApiKeys(userId) {
    const keys = await db_1.prisma.userApiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    return keys.map(convertPrismaApiKeyToType);
}
/**
 * Check if user has an active API key for a provider
 */
async function hasActiveApiKey(userId, provider) {
    const count = await db_1.prisma.userApiKey.count({
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
async function verifyApiKey(userId, provider, apiKey) {
    const storedKey = await db_1.prisma.userApiKey.findUnique({
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
    const keyHash = (0, encryption_1.hashApiKey)(apiKey);
    return keyHash === storedKey.keyHash;
}
/**
 * Clean up inactive API keys older than specified days
 */
async function cleanupInactiveApiKeys(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const result = await db_1.prisma.userApiKey.deleteMany({
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
async function getApiKeyStats() {
    const [total, active, inactive, sora, veo] = await Promise.all([
        db_1.prisma.userApiKey.count(),
        db_1.prisma.userApiKey.count({ where: { isActive: true } }),
        db_1.prisma.userApiKey.count({ where: { isActive: false } }),
        db_1.prisma.userApiKey.count({ where: { provider: 'sora', isActive: true } }),
        db_1.prisma.userApiKey.count({ where: { provider: 'veo', isActive: true } }),
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
function convertPrismaApiKeyToType(key) {
    return {
        id: key.id,
        userId: key.userId,
        provider: key.provider,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt || undefined,
    };
}
//# sourceMappingURL=apiKeys.js.map