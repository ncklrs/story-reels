# Background Job Processing Implementation

This document describes the complete background job processing system implemented for the Sora Video Generator application.

## Overview

A production-ready background job processing system using BullMQ, Redis, and TypeScript that handles video generation jobs asynchronously with proper error handling, monitoring, and health checks.

## Architecture

### Components

1. **Video Generation Worker** (`workers/video-generation-worker.ts`)
   - Processes video generation jobs from BullMQ queue
   - Integrates with Sora 2 and Veo 3.1 APIs
   - Handles polling with exponential backoff
   - Downloads videos from providers
   - Uploads to Vercel Blob Storage
   - Updates database with job status

2. **Queue Management** (`lib/queue.ts`)
   - BullMQ queue configuration with retry logic
   - Queue statistics and monitoring functions
   - Failed job retry capabilities
   - Automatic cleanup of old jobs

3. **Database Repository** (`lib/repositories/videoJobs.ts`)
   - CRUD operations for video jobs
   - Supabase/PostgreSQL integration
   - Job status tracking

4. **Structured Logger** (`lib/logger.ts`)
   - JSON-formatted logs for production
   - Multiple log levels (debug, info, warn, error)
   - Contextual logging with job metadata

5. **Health Checks** (`workers/health-check.ts`)
   - Redis connectivity monitoring
   - Queue accessibility checks
   - CLI and API endpoints

6. **Admin API Endpoints**
   - `/api/admin/queue` - Queue statistics and health
   - `/api/admin/queue/retry/[jobId]` - Retry failed jobs
   - `/api/health/worker` - Worker health status

## File Structure

```
lib/
├── logger.ts                          # Structured logging
├── queue.ts                           # BullMQ queue configuration
├── repositories/
│   └── videoJobs.ts                   # Database operations
└── integrations/
    ├── sora.ts                        # Sora 2 API client
    └── veo.ts                         # Veo 3.1 API client

workers/
├── video-generation-worker.ts         # Main worker process
└── health-check.ts                    # Health check utility

src/app/api/
├── admin/
│   └── queue/
│       ├── route.ts                   # Queue stats endpoint
│       └── retry/[jobId]/route.ts     # Retry job endpoint
└── health/
    └── worker/route.ts                # Health check endpoint

test/workers/
└── video-generation.test.ts           # Worker tests

scripts/
└── start-worker.sh                    # Production startup script

Dockerfile.worker                       # Worker Docker image
docker-compose.worker.yml              # Docker Compose configuration
```

## Worker Configuration

### Concurrency and Rate Limiting

- **Concurrency**: 2 (processes 2 videos simultaneously)
- **Rate Limit**: 10 jobs per minute
- **Max Retries**: 3 attempts with exponential backoff (2s delay)

### Polling Strategy

- **Interval**: 5 seconds
- **Max Attempts**: 120 (10 minutes total)
- **Progress Updates**: Real-time progress percentage (0-100%)

### Job Lifecycle

1. **Pending** → Job created and queued
2. **Processing** → Worker starts processing
   - Initiates video generation with provider
   - Polls for completion
   - Downloads video
   - Uploads to blob storage
3. **Completed** → Job finished successfully
4. **Failed** → Job failed (with retry logic)

## NPM Scripts

```bash
# Development
npm run worker:dev          # Run worker with hot reload (tsx watch)
npm run dev:all            # Run Next.js app + worker concurrently

# Production
npm run worker:build       # Build worker to dist/workers
npm run worker:start       # Run built worker

# Testing
npm test                   # Run all tests including worker tests
```

## Environment Variables

Required environment variables:

```bash
# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://...
SUPABASE_ANON_KEY=...

# Storage
BLOB_READ_WRITE_TOKEN=...

# Encryption
ENCRYPTION_KEY=...  # Generate with: openssl rand -base64 32

# Optional Server-Side API Keys
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_PROJECT_ID=...

# Worker Configuration
NODE_ENV=production
LOG_LEVEL=info  # debug | info | warn | error
```

## Docker Deployment

### Using Docker Compose

```bash
# Start worker with Redis
docker-compose -f docker-compose.worker.yml up -d

# With Redis Commander (debugging)
docker-compose -f docker-compose.worker.yml --profile debug up -d

# View logs
docker-compose -f docker-compose.worker.yml logs -f worker

# Stop services
docker-compose -f docker-compose.worker.yml down
```

### Using Bash Script

```bash
# Production startup
./scripts/start-worker.sh

# The script performs:
# - Environment variable validation
# - Redis connectivity check
# - Worker build (if needed)
# - Health check
# - Graceful startup
```

## Monitoring and Admin

### Queue Statistics

```bash
# Get queue stats
curl http://localhost:3000/api/admin/queue

Response:
{
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 0,
    "total": 160
  },
  "health": {
    "status": "healthy",
    "issues": []
  },
  "failedJobs": [...],
  "timestamp": "2025-10-16T..."
}
```

### Retry Failed Job

```bash
# Retry a specific job
curl -X POST http://localhost:3000/api/admin/queue/retry/[jobId]

Response:
{
  "success": true,
  "message": "Job [jobId] has been queued for retry",
  "jobId": "..."
}
```

### Health Check

```bash
# Check worker health
curl http://localhost:3000/api/health/worker

Response (200 OK if healthy):
{
  "healthy": true,
  "timestamp": "2025-10-16T...",
  "checks": {
    "redis": {
      "connected": true,
      "latencyMs": 5
    },
    "queue": {
      "accessible": true,
      "activeWorkers": 1
    }
  }
}

Response (503 if unhealthy):
{
  "healthy": false,
  "timestamp": "2025-10-16T...",
  "checks": {
    "redis": {
      "connected": false,
      "error": "Connection refused"
    },
    "queue": {
      "accessible": false,
      "error": "Queue unavailable"
    }
  }
}
```

## Logging

All worker logs are structured JSON format:

```json
{
  "timestamp": "2025-10-16T10:30:00.000Z",
  "level": "info",
  "message": "Starting video generation job",
  "service": "video-worker",
  "jobId": "job-123",
  "provider": "sora",
  "sceneId": "scene-456",
  "duration": 8
}
```

Set log level via `LOG_LEVEL` environment variable:
- `debug` - Verbose output including polling attempts
- `info` - Standard operational messages (default)
- `warn` - Warning messages
- `error` - Error messages only

## Error Handling

### Retry Strategy

Jobs automatically retry on failure:
- **Attempts**: 3 total attempts
- **Backoff**: Exponential (2s, 4s, 8s)
- **Failed Jobs**: Kept for 24 hours in queue

### Error Scenarios

1. **API Errors**: Invalid API keys, rate limits
   - Status updated to 'failed'
   - Error message stored in database
   - Job retried automatically

2. **Network Timeouts**: Provider API unavailable
   - Polling timeout after 10 minutes
   - Job retried with backoff

3. **Download/Upload Failures**: Storage issues
   - Error logged with context
   - Job marked as failed
   - Can be manually retried via admin API

4. **Database Errors**: Connection issues
   - Logged with full stack trace
   - Job remains in queue for retry

## Testing

Run tests with Vitest:

```bash
npm test                    # Run all tests
npm run test:ui            # Run with UI
```

Test coverage includes:
- Job processing logic
- Database updates
- Queue integration
- Error handling
- Health checks

## Production Deployment

### Vercel/Railway/Render

1. Deploy main Next.js app as usual
2. Deploy worker as separate service using `Dockerfile.worker`
3. Ensure both services share:
   - Same Redis instance
   - Same database
   - Same environment variables

### Kubernetes

Use provided health check endpoint for liveness/readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/worker
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Redis Requirements

- **Memory**: 256MB minimum (recommend 512MB)
- **Persistence**: AOF (append-only file) enabled
- **Version**: Redis 6.0+ recommended

## Troubleshooting

### Worker Not Processing Jobs

1. Check Redis connectivity: `redis-cli ping`
2. Verify environment variables are set
3. Check worker logs: `docker-compose logs worker`
4. Verify queue stats: `curl /api/admin/queue`

### Jobs Stuck in Processing

1. Check worker health: `curl /api/health/worker`
2. Review worker logs for errors
3. Verify provider API keys are valid
4. Check Redis for stalled jobs

### High Failure Rate

1. Review failed jobs: `GET /api/admin/queue`
2. Check provider API status
3. Verify API rate limits
4. Review error messages in database

## Performance Optimization

### Scaling Workers

Horizontal scaling:
```bash
# Run multiple worker instances
docker-compose -f docker-compose.worker.yml up -d --scale worker=3
```

Each worker will:
- Share the same Redis queue
- Process jobs concurrently
- Respect rate limits globally

### Queue Management

Clean up old jobs regularly:

```typescript
import { cleanupOldJobs } from '@/lib/queue';

// Remove jobs older than 24 hours
await cleanupOldJobs(24 * 60 * 60 * 1000);
```

## Security Considerations

1. **API Keys**: Encrypted at rest using libsodium
2. **Admin Endpoints**: Add authentication middleware in production
3. **Redis**: Use password authentication in production
4. **Environment Variables**: Never commit to version control
5. **Rate Limiting**: Consider adding rate limiting to admin endpoints

## Next Steps

### Recommended Enhancements

1. Add authentication to admin endpoints
2. Implement webhook notifications for job completion
3. Add Prometheus metrics for monitoring
4. Implement job priority queues
5. Add support for job scheduling (delayed jobs)
6. Implement dead letter queue for permanently failed jobs
7. Add support for job cancellation mid-processing

## Support

For issues or questions:
1. Check worker logs: `docker-compose logs -f worker`
2. Review health check: `curl /api/health/worker`
3. Check queue stats: `curl /api/admin/queue`
4. Review database `video_jobs` table for job details
