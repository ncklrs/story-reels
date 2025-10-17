# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sora Video Generator** - A production-ready Next.js application for generating multi-scene videos using OpenAI's Sora 2 and Google's Veo 3.1 APIs. The application transforms storyboards with character profiles into actual videos, with the ability to compile multiple scenes into a cohesive final video.

Built with Next.js 15.5.5, React 19, TypeScript, and Tailwind CSS v4.

## Development Commands

### Development Server
```bash
npm run dev
```
Starts the Next.js development server with Turbopack on http://localhost:3000.

### Build
```bash
npm run build
```
Creates an optimized production build using Turbopack.

### Tests
```bash
npm test           # Run tests
npm run test:ui    # Run tests with UI
```

### Linting
```bash
npm run lint
```

## Architecture

### Core Stack
- **Next.js 15.5.5** with App Router
- **React 19.1.0** with TypeScript 5
- **Tailwind CSS v4** with inline theme configuration
- **Turbopack** for bundling
- **BullMQ + Redis** for job queue
- **Vercel Blob Storage** for video storage
- **Supabase/PostgreSQL** for database
- **libsodium** for API key encryption

### Project Structure

```
lib/                           # Core utilities and business logic
├── types.ts                   # TypeScript type definitions
├── presets.ts                 # Visual preset configurations (cinematic, documentary, etc.)
├── soraPrompt.ts              # Prompt generation with identity tags
├── encryption.ts              # API key encryption/decryption
├── storage.ts                 # Video upload/download utilities
├── queue.ts                   # BullMQ job queue management
└── integrations/
    ├── sora.ts               # Sora 2 API client
    └── veo.ts                # Veo 3.1 API client

src/app/
├── api/
│   ├── video/
│   │   ├── generate/route.ts  # Video generation endpoint
│   │   └── status/[jobId]/route.ts  # Status polling endpoint
│   └── keys/route.ts          # API key CRUD
├── components/
│   ├── StoryboardEditor.tsx   # Main orchestrator component
│   ├── CharacterEditor.tsx    # Character profile editor
│   ├── SceneEditor.tsx        # Individual scene editor
│   ├── VideoPreview.tsx       # Video player/status display
│   └── PresetSelector.tsx     # Visual preset selector
└── page.tsx                   # Main entry point

database/
├── schema.sql                 # PostgreSQL schema
└── migrations/                # Database migrations

test/
└── soraPrompt.test.ts         # Unit tests for prompt generation
```

### Key Concepts

#### Character Identity Tags
Characters use identity tags for consistency across scenes:
```typescript
// Format: character:name-slug_id:uuid-prefix
// Example: character:sarah-chen_id:a3f2b1c9
```

Generated automatically in `lib/soraPrompt.ts:generateIdentityTag()`

#### Prompt Structure
Sora prompts follow a specific structure (see `lib/soraPrompt.ts:makeSoraPrompt()`):
1. Style (from preset)
2. Subject (character with identity tag)
3. Action (scene description)
4. Camera (shot, lens, movement)
5. Lighting
6. Color Palette
7. Sound
8. Duration

#### Visual Presets
10 pre-configured visual styles in `lib/presets.ts`:
- Cinematic, Documentary, Commercial, Vlog, Horror
- Anime, Vintage, Sci-Fi, Nature, Action

Each preset defines style, camera, lighting, palette, and sound characteristics.

#### Video Generation Flow
1. User creates storyboard with scenes and character profile
2. API generates prompt using `makeSoraPrompt()`
3. Job added to BullMQ queue via `addVideoGenerationJob()`
4. API calls Sora/Veo provider
5. Client polls `/api/video/status/[jobId]` for updates
6. Completed video uploaded to Vercel Blob
7. UI updates with video player

#### API Key Security
API keys are encrypted using libsodium before storage:
- `encryptApiKey()` - Encrypts with secretbox
- `decryptApiKey()` - Decrypts for API calls
- `hashApiKey()` - Creates SHA-256 hash for lookups
- Keys never exposed client-side

### Important Files

#### `lib/types.ts`
Core type definitions for Character, Scene, Storyboard, VideoJob, etc.

#### `lib/soraPrompt.ts`
Prompt generation logic. Critical for video quality:
- `generateIdentityTag()` - Create character identity tags
- `makeSoraPrompt()` - Build structured prompts
- `validateSoraPrompt()` - Validate prompt structure

#### `lib/integrations/sora.ts` & `veo.ts`
Provider-specific API clients:
- `generateSoraVideo()` / `generateVeoVideo()` - Initiate generation
- `getSoraVideoStatus()` / `getVeoVideoStatus()` - Poll status
- `calculateSoraCost()` / `calculateVeoCost()` - Estimate costs

#### `src/app/components/StoryboardEditor.tsx`
Main UI orchestrator:
- Manages storyboard state
- Handles scene CRUD operations
- Triggers video generation
- Polls for status updates
- LocalStorage persistence

### Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=...
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=... # Generate with: openssl rand -base64 32
OPENAI_API_KEY=sk-... (optional, for server-side default)
GOOGLE_CLOUD_PROJECT_ID=... (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Testing

Tests use Vitest. Run with `npm test`.

Key test files:
- `test/soraPrompt.test.ts` - Prompt generation logic

When adding features, write tests for:
- Prompt generation utilities
- Video status parsing
- Cost calculations
- Character identity tag generation

### Common Development Tasks

#### Adding a New Visual Preset
1. Add preset to `lib/presets.ts:SORA_PRESETS`
2. Define style, camera, lighting, palette, sound
3. Test with `makeSoraPrompt()`

#### Adding a New Video Provider
1. Create client in `lib/integrations/{provider}.ts`
2. Implement `generate{Provider}Video()` and `get{Provider}VideoStatus()`
3. Add provider type to `lib/types.ts:VideoProvider`
4. Update API routes to handle new provider
5. Add UI option in `StoryboardEditor.tsx`

#### Modifying Prompt Structure
Edit `lib/soraPrompt.ts:makeSoraPrompt()`. Ensure:
- All sections are included (Style, Subject, Action, Camera, etc.)
- Duration is appended
- Character identity tags are preserved
- Update tests in `test/soraPrompt.test.ts`

### API Pricing Notes
- **Sora 2**: $0.10/sec (standard), $0.20/sec (pro)
- **Veo 3.1**: ~$0.15 per 10 seconds

Cost calculations in `lib/integrations/sora.ts` and `veo.ts`
