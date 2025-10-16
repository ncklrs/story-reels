# Sora Video Generator

A production-ready Next.js application for generating multi-scene videos using OpenAI's Sora 2 and Google's Veo 3.1 APIs.

## Features

- **Multi-Scene Storyboards**: Create complex narratives with multiple scenes
- **Character Consistency**: Use identity tags to maintain character appearance across scenes
- **Visual Presets**: 10 pre-configured styles (Cinematic, Documentary, Commercial, etc.)
- **Dual Provider Support**: Choose between Sora 2 (OpenAI) or Veo 3.1 (Google)
- **Real-time Progress**: Monitor video generation with live progress updates
- **Secure API Key Storage**: Encrypted storage using libsodium
- **Cost Estimation**: See estimated costs before generating videos
- **Video Preview**: Built-in video player for generated content

## Quick Start

### Prerequisites

- Node.js 18+
- Redis (for job queue)
- PostgreSQL database (optional, for production)
- API keys for Sora 2 or Veo 3.1

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-video-pro

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Generate encryption key
openssl rand -base64 32
# Add to .env.local as ENCRYPTION_KEY

# Start Redis (if not running)
redis-server

# Run development server
npm run dev
```

Visit http://localhost:3000

### Environment Setup

Edit `.env.local`:

```env
# Required
ENCRYPTION_KEY=<generated-32-byte-key>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
REDIS_URL=redis://localhost:6379

# Optional (can also add via UI)
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_PROJECT_ID=...
DATABASE_URL=postgresql://...
```

## Usage

### 1. Setup API Keys

In the UI, enter your API key:
- **Sora 2**: OpenAI API key (starts with `sk-`)
- **Veo 3.1**: Google Cloud project ID and API key

### 2. Define Character Profile

Fill in character details:
- Name (required)
- Physical attributes (age, gender, physique, face, hair)
- Clothing and signature items

An identity tag is auto-generated to ensure consistency across scenes.

### 3. Select Visual Preset

Choose from 10 styles:
- Cinematic (35mm, moody lighting)
- Documentary (handheld, natural)
- Commercial (studio, vibrant)
- Vlog (POV, casual)
- Horror (low-key, suspense)
- And more...

### 4. Create Scenes

For each scene:
- **Subject**: Describe what's happening
- **Action**: Detail the movement/activity
- **Duration**: Choose 4, 8, or 12 seconds

### 5. Generate Videos

Click "Generate Video" on any scene. The system will:
1. Build an optimized prompt
2. Submit to Sora/Veo API
3. Poll for completion
4. Upload to storage
5. Display in preview player

### 6. Download or Compile

- Download individual scene videos
- (Coming soon) Compile multiple scenes into one video

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, BullMQ, Redis
- **Storage**: Vercel Blob Storage
- **Database**: PostgreSQL (Supabase/Neon)
- **Video APIs**: OpenAI Sora 2, Google Veo 3.1

### Key Components

- **StoryboardEditor**: Main UI orchestrator
- **CharacterEditor**: Character profile management
- **SceneEditor**: Individual scene configuration
- **VideoPreview**: Video player with status tracking
- **PresetSelector**: Visual style selection

### Prompt Engineering

Videos are generated using structured prompts:

```
Style: Cinematic film, 35mm.
Subject: character:sarah-chen_id:a3f2b1c9. 28 years old, Female, Athletic build, wearing business casual attire.
Action: walking through a busy city street, stops to look at a window display.
Camera: Medium shot, 35mm, Slow dolly in.
Lighting: Moody, low-key lighting with dramatic shadows.
Palette: #1a1a2e, #16213e, #0f3460, #533483.
Sound: Atmospheric score with deep bass.
Duration: 8 seconds.
```

## API Costs

- **Sora 2**: $0.10/sec (standard), $0.20/sec (pro)
- **Veo 3.1**: ~$0.15 per 10 seconds

Example: An 8-second Sora 2 video costs $0.80

## Development

### Run Tests

```bash
npm test           # Run all tests
npm run test:ui    # Run with UI
```

### Build for Production

```bash
npm run build
npm start
```

### Database Setup

```bash
# Run schema
psql $DATABASE_URL < database/schema.sql
```

## Project Structure

```
lib/                    # Core utilities
├── types.ts           # TypeScript definitions
├── presets.ts         # Visual preset configs
├── soraPrompt.ts      # Prompt generation
├── encryption.ts      # API key security
└── integrations/      # Provider API clients

src/app/
├── api/               # API routes
├── components/        # React components
└── page.tsx           # Main entry

database/              # Schema and migrations
test/                  # Unit tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
# story-reels
