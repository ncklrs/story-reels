# Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- Redis running (for production queue features)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Encryption Key

Run the following command to generate a secure encryption key:

```bash
npm run generate-key
```

This will output something like:
```
ENCRYPTION_KEY=abc123...xyz789==
```

### 3. Create Environment File

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

### 4. Configure Environment Variables

Edit `.env.local` and add the encryption key you generated:

```env
ENCRYPTION_KEY=<paste-your-generated-key-here>
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Required Variables:**
- `ENCRYPTION_KEY` - Generated in step 2 (REQUIRED)
- `REDIS_URL` - Redis connection string (optional for development, required for production)

**Optional Variables:**
- `DATABASE_URL` - If using a database
- `BLOB_STORAGE_URL` - For blob storage
- `OPENAI_API_KEY` - Server-side OpenAI key (optional)
- `GOOGLE_CLOUD_PROJECT_ID` - For Google services

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## First Use

1. **Set up your API key:**
   - Select provider (Sora or Veo)
   - Enter your API key
   - Click "Save" - the key will be encrypted and stored in an HTTP-only cookie

2. **Create your first scene:**
   - Define a character profile
   - Add scenes with subject and action
   - Click "Generate" to create videos

## Security Features

All security fixes have been implemented:

- API keys stored in encrypted HTTP-only cookies (not localStorage)
- Input validation on all API routes
- Memory leak prevention with proper polling cleanup
- Race condition fixes using scene IDs
- SSR-safe localStorage access
- Error boundaries for graceful error handling
- Environment variable validation

## Troubleshooting

### "ENCRYPTION_KEY must be a valid base64-encoded 32-byte key"

- Run `npm run generate-key` again
- Make sure you copied the full key including any `=` padding
- Verify there are no spaces or line breaks in the key

### "Cannot access localStorage during SSR"

- This has been fixed with the `useSafeLocalStorage` hook
- If you still see this error, clear your browser cache and restart the dev server

### "No API key found in session"

- Make sure you clicked "Save" after entering your API key
- Check that cookies are enabled in your browser
- Verify `ENCRYPTION_KEY` is set in `.env.local`

### Redis Connection Issues

- For development, Redis is optional (some features may not work)
- For production, ensure Redis is running and `REDIS_URL` is correct
- Test connection: `redis-cli ping` should return `PONG`

## Production Deployment

See `SECURITY-FIXES.md` for detailed production deployment notes.

**Key points:**
- Set `NODE_ENV=production`
- Use HTTPS (required for secure cookies)
- Generate a new `ENCRYPTION_KEY` for production
- Ensure Redis is properly configured
- Enable rate limiting (recommended)

## Testing the Fixes

### Test API Key Security
```bash
# After saving API key, check DevTools > Application > Cookies
# Should see: api_key_sora or api_key_veo (HttpOnly, Secure in prod)
```

### Test Memory Leak Fix
```bash
# Start video generation, then delete scene
# Check console - no errors, polling stops automatically
```

### Test Error Boundary
```bash
# Error boundary catches errors gracefully
# Shows friendly UI instead of crashing
```

## Additional Resources

- Full documentation: `SECURITY-FIXES.md`
- Environment variables: `.env.local.example`
- Generate encryption key: `npm run generate-key`

## Support

For issues or questions about the security fixes:
1. Check `SECURITY-FIXES.md` for detailed explanations
2. Verify environment variables are correct
3. Check browser console for detailed error messages
4. Ensure all dependencies are installed (`npm install`)
