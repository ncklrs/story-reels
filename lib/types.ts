export type CharacterProfile = {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  ethnicity?: string;
  physique?: string;
  face?: string;
  hair?: string;
  clothing?: string;
  signature_item?: string;
  tone?: string;
  continuity_reference?: string;
  identity_tag?: string; // Format: character:name-slug_id:uuid-prefix
  imageDataUrl?: string | null;
};

export type SoraPreset = {
  key: string;
  label: string;
  style: string;
  camera: { shot: string; lens?: string; move?: string };
  lighting?: string;
  palette?: string[];
  sound?: string;
};

export type Scene = {
  id: string;
  subject: string;
  action: string;
  duration: 4 | 8 | 12; // seconds
  imageDataUrl?: string | null;
  videoJob?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    provider: 'sora' | 'veo';
    progress?: number; // 0-100
    videoUrl?: string;
    thumbnailUrl?: string;
    errorMessage?: string;
    cost?: number;
  };
};

export type Storyboard = {
  id: string;
  userId?: string; // Optional - for guest users vs authenticated users
  presetKey: string;
  character: CharacterProfile;
  scenes: Scene[];
};

export type VideoProvider = 'sora' | 'veo';

export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoJob {
  id: string;
  storyboardId: string;
  sceneId: string;
  provider: VideoProvider;
  status: VideoJobStatus;
  prompt: string;
  providerJobId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  cost?: number;
  errorMessage?: string;
  metadata?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface SoraGenerateRequest {
  prompt: string;
  model: 'sora-2' | 'sora-2-pro';
  size: '1280x720' | '720x1280' | '1792x1024' | '1024x1792';
  seconds: 4 | 8 | 12;
  image_reference?: string;
}

export interface VeoGenerateRequest {
  prompt: string;
  model: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview';
  resolution: '720p' | '1080p';
  duration: 4 | 6 | 8;
  fps: 24;
  reference_images?: string[]; // max 3
}

export interface GoogleCredentials {
  projectId: string;
  apiKey: string;
}

export interface CompiledVideo {
  id: string;
  storyboardId: string;
  scenesOrder: string[];
  finalVideoUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  createdAt: Date;
}

/**
 * API Response types for Sora and Veo integrations
 */
export interface SoraAPIResponse {
  id: string;
  status: string;
  video_url?: string;
  thumbnail_url?: string;
  output?: {
    url?: string;
    thumbnail?: string;
  };
  error?: {
    message: string;
    code?: string;
    type?: string;
  };
}

export interface VeoAPIResponse {
  name: string; // Operation name
  done: boolean;
  error?: {
    code: number;
    message: string;
    status: string;
  };
  response?: {
    videos?: Array<{
      gcsUri?: string;
      url?: string;
      mimeType?: string;
    }>;
    raiMediaFilteredReasons?: string[];
  };
}

/**
 * Mock job types for development/testing
 */
export interface MockJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startTime: number;
  prompt: string;
  model: string;
}
