-- Video generation jobs
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  provider VARCHAR(10) NOT NULL CHECK (provider IN ('sora', 'veo')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  provider_job_id VARCHAR(255),
  video_url TEXT,
  thumbnail_url TEXT,
  cost DECIMAL(10, 4),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- User API keys (encrypted)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(10) NOT NULL CHECK (provider IN ('sora', 'veo')),
  encrypted_key TEXT NOT NULL,
  key_hash VARCHAR(64) NOT NULL, -- For lookup without decryption
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, provider)
);

-- Compiled videos (multi-scene)
CREATE TABLE compiled_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL,
  scenes_order JSONB NOT NULL, -- Array of scene IDs in order
  final_video_url TEXT,
  duration_seconds INT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_video_jobs_storyboard ON video_jobs(storyboard_id);
CREATE INDEX idx_video_jobs_status ON video_jobs(status);
CREATE INDEX idx_video_jobs_created ON video_jobs(created_at DESC);
CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);
