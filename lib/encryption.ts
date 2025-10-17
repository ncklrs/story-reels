import crypto from 'crypto';
import sodium from 'libsodium-wrappers';

/**
 * Encryption utilities for API key storage using libsodium
 */

export async function initSodium() {
  await sodium.ready;
}

/**
 * Encrypt an API key using the application encryption key
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
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
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = new TextEncoder().encode(apiKey);

  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);

  // Combine nonce + ciphertext and encode as base64
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt an encrypted API key
 */
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  await initSodium();

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  const key = new Uint8Array(keyBuffer);

  const combined = new Uint8Array(Buffer.from(encryptedKey, 'base64'));
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Create a SHA-256 hash of an API key for lookup/verification
 * This allows us to verify keys without decrypting them
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify an API key matches its hash
 */
export function verifyApiKeyHash(apiKey: string, hash: string): boolean {
  return hashApiKey(apiKey) === hash;
}

/**
 * Generate a secure encryption key (for .env setup)
 * Returns a base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
