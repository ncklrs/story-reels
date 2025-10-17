# Agents Execution Plan - Sora Video Generator

## Overview
This document provides a roadmap for completing the Sora Video Generator using specialized agent prompts. Each agent is designed to be executed independently with clear dependencies.

---

## ✅ Agent 1: Security & Infrastructure Fixes (COMPLETED)

**Status**: ✅ COMPLETE
**Time Taken**: ~2 hours
**Priority**: 🔴 CRITICAL

### What Was Accomplished
- ✅ API key security verified (HTTP-only cookies, encryption)
- ✅ Input validation added to all endpoints (Zod schemas)
- ✅ Rate limiting implemented with @upstash/ratelimit
  - Video generation: 10 req/min
  - Video compilation: 5 req/min
  - Auth sessions: 20 req/min
- ✅ Memory leak prevention verified (usePolling hook)
- ✅ Environment variables documented (.env.example)
- ✅ Build verification (all tests pass)

### Files Modified (11 files)
1. `lib/validation.ts` - Added jobIdParamsSchema
2. `lib/ratelimit.ts` - Created (169 lines)
3. `src/app/api/video/status/[jobId]/route.ts` - Added validation
4. `src/app/api/video/generate/route.ts` - Added rate limiting
5. `src/app/api/video/compile/route.ts` - Added rate limiting
6. `src/app/api/auth/session/route.ts` - Added rate limiting
7. `.env.example` - Comprehensive documentation
8. `package.json` - Added @upstash packages
9. Built successfully ✓

### Security Improvements
- 🔒 No API keys exposed to client
- 🔒 All inputs validated with proper error messages
- 🔒 Rate limiting prevents abuse and cost overruns
- 🔒 Memory leaks eliminated
- 🔒 Production-ready security foundation

---

## 📋 Agent 2: Database & Persistence Layer

**Status**: ⏳ READY TO EXECUTE
**Estimated Time**: 2-3 days
**Priority**: 🔴 CRITICAL
**Dependencies**: None (can start immediately)
**Prompt Location**: `AGENT_2_PROMPT.md`

### Objective
Implement PostgreSQL persistence with Prisma ORM, create repository pattern for data access, and migrate all API routes from localStorage to database storage.

### Key Tasks
1. **Set Up Prisma ORM** (1-2 hours)
   - Install Prisma packages
   - Create schema matching existing types
   - Generate Prisma Client
   - Set up database connection utility

2. **Create Repository Pattern** (2-3 hours)
   - `lib/repositories/videoJobs.ts`
   - `lib/repositories/storyboards.ts`
   - `lib/repositories/apiKeys.ts`
   - `lib/repositories/compiledVideos.ts`

3. **Update API Routes** (2-3 hours)
   - Migrate video generation to use DB
   - Migrate status checks to use DB
   - Create storyboard CRUD endpoints
   - Update frontend auto-save

4. **Run Migrations & Test** (1 hour)
   - Create initial migration
   - Set up local database
   - Test all CRUD operations
   - Verify Prisma Studio

### Files to Create (11 files)
- `prisma/schema.prisma`
- `lib/db.ts`
- `lib/repositories/*.ts` (4 files)
- `src/app/api/storyboards/route.ts`
- `src/app/api/storyboards/[id]/route.ts`
- `scripts/test-db.ts`

### Files to Modify (3 files)
- `src/app/api/video/generate/route.ts`
- `src/app/api/video/status/[jobId]/route.ts`
- `src/app/components/StoryboardEditor.tsx`

### Success Criteria
- ✅ All data persists across sessions
- ✅ Multiple storyboards per user supported
- ✅ Video jobs tracked in database
- ✅ Build passes without errors
- ✅ Prisma Studio shows data correctly

### Quick Start
```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Follow AGENT_2_PROMPT.md for detailed steps
```

---

## 🔧 Agent 3: Background Job Processing

**Status**: ⏳ READY TO EXECUTE
**Estimated Time**: 2-3 days
**Priority**: 🔴 CRITICAL
**Dependencies**: Agent 2 must be complete
**Prompt Location**: `AGENT_3_PROMPT.md`

### Objective
Create BullMQ worker processes that consume jobs from the queue, call provider APIs, poll for completion, upload videos to storage, and update database with results.

### Key Tasks
1. **Create Worker Process** (3-4 hours)
   - Main worker file with job processing logic
   - Provider API integration (Sora/Veo)
   - Polling and status updates
   - Video upload to Vercel Blob
   - Database status updates

2. **Configure Queue & Retry** (1-2 hours)
   - Update queue configuration
   - Add retry logic (3 attempts, exponential backoff)
   - Implement job cleanup
   - Add queue event listeners

3. **Add Monitoring** (2-3 hours)
   - Admin endpoints for queue stats
   - Health check endpoints
   - Structured logging
   - Retry mechanism for failed jobs

4. **Production Setup** (2-3 hours)
   - Dockerfile for worker
   - Docker Compose configuration
   - Startup scripts
   - Environment validation

5. **Testing** (1-2 hours)
   - Integration tests
   - Manual testing workflow
   - Health check verification

### Files to Create (13 files)
- `workers/video-generation-worker.ts` (main worker)
- `workers/health-check.ts`
- `src/app/api/admin/queue/route.ts`
- `src/app/api/admin/queue/retry/[jobId]/route.ts`
- `src/app/api/health/worker/route.ts`
- `lib/logger.ts`
- `Dockerfile.worker`
- `docker-compose.worker.yml`
- `scripts/start-worker.sh`
- `test/workers/video-generation.test.ts`

### Files to Modify (2 files)
- `lib/queue.ts` (add retry config)
- `package.json` (add worker scripts)

### Success Criteria
- ✅ Worker processes jobs from queue
- ✅ Jobs retry on failure (3 attempts)
- ✅ Database updates with status
- ✅ Videos uploaded to storage
- ✅ Monitoring endpoints work
- ✅ Health checks pass
- ✅ Production deployment ready

### Quick Start
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start worker
npm run worker:dev

# Or run both together
npm run dev:all

# Follow AGENT_3_PROMPT.md for detailed steps
```

---

## 🎨 Agent 4: Real API Integrations (Optional)

**Status**: ⏸️ BLOCKED (API not available)
**Estimated Time**: 5-7 days
**Priority**: 🟡 HIGH
**Dependencies**: Agents 1, 2, 3
**Prompt Location**: `AGENT_PROMPTS.md` (lines 782-988)

### Objective
Implement real Sora 2 and Veo 3.1 API integrations when APIs become available, or create robust mock implementations.

### Status Note
- Sora 2 API not yet publicly released by OpenAI
- Veo 3.1 API availability needs verification
- Current code uses placeholder implementations
- Can proceed with mock mode for testing

### Recommendation
**Skip for now** or implement mock mode. The placeholder code is already in place and will work once APIs are available. Focus on Agents 2 and 3 first.

---

## 💅 Agent 5: UI Enhancement (Optional)

**Status**: ⏳ CAN START ANYTIME
**Estimated Time**: 3-4 days
**Priority**: 🟡 MEDIUM
**Dependencies**: None (independent)
**Prompt Location**: `AGENT_PROMPTS.md` (lines 990-1136)

### Objective
Enhance UI components, improve mobile responsiveness, add accessibility features, and polish user experience.

### Key Areas
- Component verification and cleanup
- Mobile responsiveness improvements
- Accessibility (WCAG AA compliance)
- Loading skeletons and better error states
- Authentication UI (if needed)

### Recommendation
Can be done in parallel with Agent 2/3, but lower priority than core functionality.

---

## 🧪 Agent 6: Testing & QA (Recommended)

**Status**: ⏳ EXECUTE AFTER AGENTS 2 & 3
**Estimated Time**: 3-4 days
**Priority**: 🟡 MEDIUM
**Dependencies**: Agents 2 and 3 complete
**Prompt Location**: `AGENT_PROMPTS.md` (lines 1139-1527)

### Objective
Create comprehensive test suite covering unit, integration, and E2E tests.

### Key Tasks
- Set up testing infrastructure (Vitest, Prisma test DB)
- Write unit tests for utilities
- Integration tests for API routes
- Component tests with React Testing Library
- E2E tests for critical flows
- CI/CD pipeline with GitHub Actions

### Recommendation
Execute after Agents 2 and 3 are complete to ensure stable foundation for testing.

---

## 🎯 Recommended Execution Order

### Phase 1: Core Foundation (Week 1)
**Execute in parallel:**
1. ✅ **Agent 1: Security** (COMPLETED)
2. 📋 **Agent 2: Database** (START NOW)

**Then:**
3. 🔧 **Agent 3: Workers** (After Agent 2)

### Phase 2: Enhancement (Week 2)
**Choose based on priorities:**
- 🧪 **Agent 6: Testing** (Recommended)
- 💅 **Agent 5: UI** (If polish needed)
- 🎨 **Agent 4: APIs** (When available)

---

## 📊 Progress Tracker

| Agent | Status | Time | Priority | Dependencies |
|-------|--------|------|----------|--------------|
| 1. Security | ✅ Complete | 2h | 🔴 Critical | None |
| 2. Database | ⏳ Ready | 2-3d | 🔴 Critical | None |
| 3. Workers | ⏳ Ready | 2-3d | 🔴 Critical | Agent 2 |
| 4. APIs | ⏸️ Blocked | 5-7d | 🟡 High | Agents 1,2,3 |
| 5. UI | ⏳ Ready | 3-4d | 🟡 Medium | None |
| 6. Testing | ⏳ Ready | 3-4d | 🟡 Medium | Agents 2,3 |

**Overall Progress**: ~17% complete (1/6 agents)

---

## 🚀 Next Steps

### Immediate (Do Now)
1. **Start Agent 2: Database & Persistence**
   - Open `AGENT_2_PROMPT.md`
   - Install Prisma: `npm install prisma @prisma/client`
   - Set up local PostgreSQL database
   - Follow step-by-step instructions

2. **Set Up Local Database**
   ```bash
   # Option 1: PostgreSQL locally
   brew install postgresql
   createdb sora_video_gen_dev

   # Option 2: Use hosted DB (Supabase, Neon, Railway)
   # Get connection string and add to .env.local
   ```

3. **Prepare for Agent 3**
   - Ensure Redis is running: `redis-server`
   - Review worker prompt: `AGENT_3_PROMPT.md`

### This Week
- ✅ Complete Agent 2 (Database)
- ✅ Complete Agent 3 (Workers)
- ✅ Have working end-to-end video generation

### Next Week
- Choose: Testing (Agent 6) or UI (Agent 5)
- Deploy to staging environment
- Test with real users

---

## 📝 How to Use Agent Prompts

Each agent prompt is a **complete, standalone implementation guide** with:
- ✅ Clear objectives and context
- ✅ Step-by-step tasks with code examples
- ✅ Files to create/modify with exact locations
- ✅ Success criteria and testing steps
- ✅ Common issues and solutions

**To execute an agent:**
1. Read the prompt file (e.g., `AGENT_2_PROMPT.md`)
2. Follow tasks sequentially
3. Copy/paste code examples (modify as needed)
4. Test after each major task
5. Verify success criteria
6. Move to next agent

**Example workflow:**
```bash
# 1. Open prompt
cat AGENT_2_PROMPT.md

# 2. Start task 1
npm install prisma @prisma/client

# 3. Create files as instructed
# ... follow prompt ...

# 4. Test
npm run build
npx prisma studio

# 5. Verify success criteria
# ✅ All CRUD operations work
# ✅ Build passes
```

---

## 🎉 What You'll Have After Completion

### After Agent 2 (Database)
- ✅ PostgreSQL persistence
- ✅ Multiple storyboards per user
- ✅ Data survives across sessions
- ✅ Production-ready data layer

### After Agent 3 (Workers)
- ✅ Background video processing
- ✅ Automatic retries on failure
- ✅ Real-time status updates
- ✅ Monitoring and health checks
- ✅ Scalable architecture

### After All Critical Agents (1, 2, 3)
- ✅ **Fully functional video generation app**
- ✅ Secure, rate-limited API
- ✅ Persistent storage
- ✅ Background processing
- ✅ Production deployment ready
- ✅ ~75% feature complete

---

## 💡 Tips for Success

1. **Follow the order**: Agents 1 → 2 → 3 for critical path
2. **Test incrementally**: Don't wait until the end
3. **Use Prisma Studio**: Great for debugging database issues
4. **Monitor logs**: Watch worker logs to see job processing
5. **Start simple**: Get basic flow working, then optimize
6. **Keep prompts open**: Reference them as you code
7. **Ask questions**: Prompts are detailed but not exhaustive

---

## 📞 Support Resources

- **Prompts**: All agent prompts in this repo
- **Documentation**: See `README.md`, `SETUP-GUIDE.md`
- **Database Schema**: `database/schema.sql`
- **Type Definitions**: `lib/types.ts`
- **Current API Routes**: `src/app/api/**`
- **Existing Components**: `src/app/components/**`

---

**Ready to continue?** Start with Agent 2 in `AGENT_2_PROMPT.md` 🚀
