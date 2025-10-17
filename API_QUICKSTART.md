# API Integration Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Enable Mock Mode (No API Keys Needed)

```bash
# Add to your .env.local file
SORA_MOCK_MODE=true
VEO_MOCK_MODE=true
```

That's it! You can now test the video generation features without any API credentials.

### 2. Test Mock Video Generation

```typescript
import { generateSoraVideo, getSoraVideoStatus } from '@/lib/integrations/sora';

// Generate a mock video
const { jobId } = await generateSoraVideo('any-key', {
  prompt: 'A cinematic shot of a sunset',
  model: 'sora-2',
  size: '1280x720',
  seconds: 4
});

// Check status (will be 'queued' initially)
const status = await getSoraVideoStatus('any-key', jobId);
console.log(status); // { id: '...', status: 'queued' }

// Wait 2 seconds and check again (will be 'processing')
setTimeout(async () => {
  const status2 = await getSoraVideoStatus('any-key', jobId);
  console.log(status2); // { id: '...', status: 'processing' }
}, 2000);

// Wait 10 seconds and check again (will be 'completed' with video URL)
setTimeout(async () => {
  const status3 = await getSoraVideoStatus('any-key', jobId);
  console.log(status3);
  // { id: '...', status: 'completed', videoUrl: 'https://mock-sora-videos.example.com/...' }
}, 10000);
```

### 3. Mock Behavior

**Sora Mock Mode:**
- Queued → Processing: 2 seconds
- Processing → Completed: 10 seconds total
- Returns mock video URL: `https://mock-sora-videos.example.com/{jobId}.mp4`

**Veo Mock Mode:**
- Same timing as Sora
- Returns mock video URL: `https://mock-veo-videos.example.com/{jobId}.mp4`

## 🔑 Using Real APIs

### Sora 2 (OpenAI)

#### Step 1: Get API Access
1. Join the Sora waitlist at https://platform.openai.com
2. Once approved, get your API key from https://platform.openai.com/api-keys

#### Step 2: Configure Environment
```bash
OPENAI_API_KEY=sk-your-actual-key-here
SORA_MOCK_MODE=false  # Important: disable mock mode
```

#### Step 3: Verify Organization
If you see "organization must be verified" error:
1. Go to https://platform.openai.com/settings/organization/general
2. Click "Verify Organization"
3. Wait ~15 minutes for access to propagate

#### Step 4: Generate Videos
```typescript
const { jobId } = await generateSoraVideo(process.env.OPENAI_API_KEY!, {
  prompt: 'Your creative prompt here',
  model: 'sora-2-pro', // or 'sora-2'
  size: '1280x720',
  seconds: 8
});
```

### Veo 3.1 (Google Vertex AI)

#### Step 1: Set Up Google Cloud Project
```bash
# 1. Create a project at https://console.cloud.google.com
# 2. Enable Vertex AI API
# 3. Create a service account with Vertex AI permissions
# 4. Download the service account JSON key
```

#### Step 2: Configure Environment
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1  # optional
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VEO_MOCK_MODE=false  # Important: disable mock mode
```

#### Step 3: Get Access Token
```bash
# Generate a bearer token
gcloud auth print-access-token
```

#### Step 4: Generate Videos
```typescript
import { generateVeoVideo } from '@/lib/integrations/veo';

const { jobId } = await generateVeoVideo(
  {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    apiKey: 'your-bearer-token' // from gcloud auth print-access-token
  },
  {
    prompt: 'Your creative prompt here',
    model: 'veo-3.1-generate-preview',
    resolution: '1080p',
    duration: 8,
    fps: 24
  }
);
```

## 🚨 Error Handling

### Basic Error Handling
```typescript
import { VideoGenerationError, VideoErrorCode } from '@/lib/integrations/errors';

try {
  const result = await generateSoraVideo(apiKey, request);
} catch (error) {
  if (error instanceof VideoGenerationError) {
    switch (error.code) {
      case VideoErrorCode.INVALID_API_KEY:
        console.error('Invalid API key provided');
        break;
      case VideoErrorCode.RATE_LIMIT_EXCEEDED:
        console.error('Rate limit hit, retry after delay');
        if (error.retryable) {
          // Implement retry logic
        }
        break;
      case VideoErrorCode.CONTENT_POLICY_VIOLATION:
        console.error('Content violates policy:', error.message);
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

### Automatic Retry
The integrations automatically retry on retryable errors (network issues, rate limits, 5xx errors):

```typescript
// This will automatically retry up to 3 times with exponential backoff
const result = await generateSoraVideo(apiKey, request);
```

## 📊 Status Polling Pattern

```typescript
async function pollVideoStatus(
  apiKey: string,
  jobId: string,
  maxAttempts: number = 60 // 60 * 5s = 5 minutes max
): Promise<SoraVideoResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getSoraVideoStatus(apiKey, jobId);

    if (status.status === 'completed') {
      return status; // Success!
    }

    if (status.status === 'failed') {
      throw new Error(`Video generation failed: ${status.error}`);
    }

    // Still processing, wait 5 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Video generation timed out');
}

// Usage
const { jobId } = await generateSoraVideo(apiKey, request);
const finalStatus = await pollVideoStatus(apiKey, jobId);
console.log('Video URL:', finalStatus.videoUrl);
```

## 💰 Cost Estimation

### Sora 2
```typescript
import { calculateSoraCost } from '@/lib/integrations/sora';

const cost = calculateSoraCost('sora-2-pro', 8); // $1.60
console.log(`Estimated cost: $${cost.toFixed(2)}`);
```

### Veo 3.1
```typescript
import { calculateVeoCost } from '@/lib/integrations/veo';

const cost = calculateVeoCost(8); // $0.12
console.log(`Estimated cost: $${cost.toFixed(2)}`);
```

## 🔍 Debugging

### Enable Detailed Logging
The integrations include comprehensive logging:

```typescript
// Console output will show:
// [Sora] Starting video generation { model: 'sora-2', duration: 8, mockMode: false }
// [Sora] Video generation initiated { jobId: '...' }
// [Sora] Checking video status { jobId: '...', mockMode: false }
// [Sora] Status check result { jobId: '...', status: 'completed' }
```

### Check Mock Mode Status
```typescript
// In your code
console.log('Sora Mock Mode:', process.env.SORA_MOCK_MODE === 'true');
console.log('Veo Mock Mode:', process.env.VEO_MOCK_MODE === 'true');
```

## 🧪 Testing

### Run Integration Tests
```bash
# Enable mock mode for tests
export SORA_MOCK_MODE=true
export VEO_MOCK_MODE=true

# Run tests
npm test -- test/integrations.test.ts
```

### Manual Testing Checklist
- [ ] Test Sora mock mode (generate + poll status)
- [ ] Test Veo mock mode (generate + poll status)
- [ ] Verify 10-second completion timing
- [ ] Test error handling (invalid job ID)
- [ ] Test with real Sora API key (if available)
- [ ] Test with real Veo credentials (if available)
- [ ] Verify retry logic on network errors
- [ ] Check cost calculations

## 📚 Reference

### Error Codes Reference
| Code | Description | Retryable |
|------|-------------|-----------|
| INVALID_API_KEY | Invalid authentication | ❌ No |
| RATE_LIMIT_EXCEEDED | Too many requests | ✅ Yes |
| CONTENT_POLICY_VIOLATION | Content violates policy | ❌ No |
| NETWORK_ERROR | Network connectivity issue | ✅ Yes |
| SERVICE_UNAVAILABLE | Provider service down | ✅ Yes |
| GENERATION_TIMEOUT | Generation took too long | ✅ Yes |

Full error code list: See `/lib/integrations/errors.ts`

### API Endpoints

**Sora 2:**
- Generate: `POST https://api.openai.com/v1/video/generations`
- Status: `GET https://api.openai.com/v1/video/generations/{jobId}`

**Veo 3.1:**
- Generate: `POST https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:predictLongRunning`
- Status: `POST https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:fetchPredictOperation`

### Response Status Mapping
| Sora Status | Veo Status | Our Status |
|-------------|------------|------------|
| queued | done=false, no error | queued |
| processing | done=false, no error | processing |
| completed | done=true, no error | completed |
| failed | done=true/false, has error | failed |

## 🆘 Common Issues

### "Organization must be verified" (Sora)
- **Solution**: Visit https://platform.openai.com/settings/organization/general and verify
- Wait ~15 minutes after verification

### "Invalid credentials" (Veo)
- **Solution**: Ensure service account has Vertex AI permissions
- Verify project ID is correct
- Check bearer token hasn't expired (tokens expire after 1 hour)

### "Rate limit exceeded"
- **Solution**: The integration automatically retries with backoff
- Implement request queuing if hitting limits frequently
- Consider upgrading API tier

### Mock mode not working
- **Solution**: Verify environment variables are set to string `'true'`
- Check `.env.local` file is in project root
- Restart dev server after changing env vars

## 📖 Additional Documentation
- Full Implementation Report: `/INTEGRATION_REPORT.md`
- Error Handling Details: `/lib/integrations/errors.ts`
- Type Definitions: `/lib/types.ts`
- Test Suite: `/test/integrations.test.ts`
