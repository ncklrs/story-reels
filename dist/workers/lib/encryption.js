"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSodium = initSodium;
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
exports.hashApiKey = hashApiKey;
exports.verifyApiKeyHash = verifyApiKeyHash;
exports.generateEncryptionKey = generateEncryptionKey;
const crypto_1 = __importDefault(require("crypto"));
const libsodium_wrappers_1 = __importDefault(require("libsodium-wrappers"));
/**
 * Encryption utilities for API key storage using libsodium
 */
async function initSodium() {
    await libsodium_wrappers_1.default.ready;
}
/**
 * Encrypt an API key using the application encryption key
 */
async function encryptApiKey(apiKey) {
    await initSodium();
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // Convert base64 encryption key to Uint8Array
    const keyBuffer = Buffer.from(encryptionKey, 'base64');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
    }
    const key = new Uint8Array(keyBuffer);
    const nonce = libsodium_wrappers_1.default.randombytes_buf(libsodium_wrappers_1.default.crypto_secretbox_NONCEBYTES);
    const message = new TextEncoder().encode(apiKey);
    const ciphertext = libsodium_wrappers_1.default.crypto_secretbox_easy(message, nonce, key);
    // Combine nonce + ciphertext and encode as base64
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);
    return Buffer.from(combined).toString('base64');
}
/**
 * Decrypt an encrypted API key
 */
async function decryptApiKey(encryptedKey) {
    await initSodium();
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    const keyBuffer = Buffer.from(encryptionKey, 'base64');
    const key = new Uint8Array(keyBuffer);
    const combined = new Uint8Array(Buffer.from(encryptedKey, 'base64'));
    const nonce = combined.slice(0, libsodium_wrappers_1.default.crypto_secretbox_NONCEBYTES);
    const ciphertext = combined.slice(libsodium_wrappers_1.default.crypto_secretbox_NONCEBYTES);
    const decrypted = libsodium_wrappers_1.default.crypto_secretbox_open_easy(ciphertext, nonce, key);
    if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
    }
    return new TextDecoder().decode(decrypted);
}
/**
 * Create a SHA-256 hash of an API key for lookup/verification
 * This allows us to verify keys without decrypting them
 */
function hashApiKey(apiKey) {
    return crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
}
/**
 * Verify an API key matches its hash
 */
function verifyApiKeyHash(apiKey, hash) {
    return hashApiKey(apiKey) === hash;
}
/**
 * Generate a secure encryption key (for .env setup)
 * Returns a base64-encoded 32-byte key
 */
function generateEncryptionKey() {
    return crypto_1.default.randomBytes(32).toString('base64');
}
//# sourceMappingURL=encryption.js.map