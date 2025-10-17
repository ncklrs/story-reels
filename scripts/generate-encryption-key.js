#!/usr/bin/env node

/**
 * Script to generate a secure encryption key for API key storage
 * Run this script and add the output to your .env.local file
 */

const crypto = require('crypto');

function generateEncryptionKey() {
  // Generate a random 32-byte key
  const key = crypto.randomBytes(32);

  // Encode as base64
  const base64Key = key.toString('base64');

  console.log('\n===========================================');
  console.log('Generated Encryption Key');
  console.log('===========================================\n');
  console.log('Copy the following line to your .env.local file:\n');
  console.log(`ENCRYPTION_KEY=${base64Key}\n`);
  console.log('===========================================');
  console.log('\nIMPORTANT:');
  console.log('- Keep this key secure and never commit it to version control');
  console.log('- Use a different key for each environment (dev, staging, production)');
  console.log('- If the key is ever compromised, generate a new one immediately');
  console.log('- Changing the key will invalidate all existing encrypted API keys');
  console.log('===========================================\n');
}

generateEncryptionKey();
