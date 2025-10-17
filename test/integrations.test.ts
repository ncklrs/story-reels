import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSoraVideo, getSoraVideoStatus, validateSoraApiKey } from '../lib/integrations/sora';
import { generateVeoVideo, getVeoVideoStatus, validateVeoCredentials } from '../lib/integrations/veo';
import { SoraGenerateRequest, VeoGenerateRequest, GoogleCredentials } from '../lib/types';

/**
 * Integration Tests for Sora and Veo APIs
 *
 * These tests verify both real API implementation and mock mode functionality.
 * Set SORA_MOCK_MODE=true and VEO_MOCK_MODE=true to test mock implementations.
 */

describe('Sora Integration', () => {
  const mockApiKey = 'test-api-key';

  const mockRequest: SoraGenerateRequest = {
    prompt: 'A cinematic shot of a person walking',
    model: 'sora-2',
    size: '1280x720',
    seconds: 4
  };

  beforeEach(() => {
    // Ensure mock mode is enabled for tests
    process.env.SORA_MOCK_MODE = 'true';
  });

  describe('generateSoraVideo', () => {
    it('should generate a video job ID in mock mode', async () => {
      const result = await generateSoraVideo(mockApiKey, mockRequest);

      expect(result).toHaveProperty('jobId');
      expect(result.jobId).toContain('mock-sora-');
    });

    it('should handle different models', async () => {
      const proRequest: SoraGenerateRequest = {
        ...mockRequest,
        model: 'sora-2-pro'
      };

      const result = await generateSoraVideo(mockApiKey, proRequest);
      expect(result.jobId).toBeDefined();
    });

    it('should handle different durations', async () => {
      const longRequest: SoraGenerateRequest = {
        ...mockRequest,
        seconds: 12
      };

      const result = await generateSoraVideo(mockApiKey, longRequest);
      expect(result.jobId).toBeDefined();
    });
  });

  describe('getSoraVideoStatus', () => {
    it('should return queued status initially', async () => {
      const { jobId } = await generateSoraVideo(mockApiKey, mockRequest);
      const status = await getSoraVideoStatus(mockApiKey, jobId);

      expect(status).toHaveProperty('id', jobId);
      expect(['queued', 'processing', 'completed']).toContain(status.status);
    });

    it('should transition to processing status', async () => {
      const { jobId } = await generateSoraVideo(mockApiKey, mockRequest);

      // Wait for processing status
      await new Promise(resolve => setTimeout(resolve, 2500));

      const status = await getSoraVideoStatus(mockApiKey, jobId);
      expect(['processing', 'completed']).toContain(status.status);
    });

    it('should complete with video URL after 10 seconds', async () => {
      const { jobId } = await generateSoraVideo(mockApiKey, mockRequest);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 10500));

      const status = await getSoraVideoStatus(mockApiKey, jobId);
      expect(status.status).toBe('completed');
      expect(status.videoUrl).toBeDefined();
      expect(status.videoUrl).toContain('mock-sora-videos');
    });

    it('should return failed status for non-existent job', async () => {
      const status = await getSoraVideoStatus(mockApiKey, 'non-existent-job-id');

      expect(status.status).toBe('failed');
      expect(status.error).toBeDefined();
    });
  });

  describe('validateSoraApiKey', () => {
    it('should validate API key in mock mode', async () => {
      const isValid = await validateSoraApiKey(mockApiKey);
      expect(isValid).toBe(true);
    });
  });
});

describe('Veo Integration', () => {
  const mockCredentials: GoogleCredentials = {
    projectId: 'test-project',
    apiKey: 'test-api-key'
  };

  const mockRequest: VeoGenerateRequest = {
    prompt: 'A cinematic shot of a person walking',
    model: 'veo-3.1-generate-preview',
    resolution: '720p',
    duration: 4,
    fps: 24
  };

  beforeEach(() => {
    // Ensure mock mode is enabled for tests
    process.env.VEO_MOCK_MODE = 'true';
  });

  describe('generateVeoVideo', () => {
    it('should generate a video job ID in mock mode', async () => {
      const result = await generateVeoVideo(mockCredentials, mockRequest);

      expect(result).toHaveProperty('jobId');
      expect(result.jobId).toContain('mock-veo-');
    });

    it('should handle fast model', async () => {
      const fastRequest: VeoGenerateRequest = {
        ...mockRequest,
        model: 'veo-3.1-fast-generate-preview'
      };

      const result = await generateVeoVideo(mockCredentials, fastRequest);
      expect(result.jobId).toBeDefined();
    });

    it('should handle different resolutions', async () => {
      const hdRequest: VeoGenerateRequest = {
        ...mockRequest,
        resolution: '1080p'
      };

      const result = await generateVeoVideo(mockCredentials, hdRequest);
      expect(result.jobId).toBeDefined();
    });

    it('should handle reference images', async () => {
      const imageRequest: VeoGenerateRequest = {
        ...mockRequest,
        reference_images: ['base64-image-1', 'base64-image-2']
      };

      const result = await generateVeoVideo(mockCredentials, imageRequest);
      expect(result.jobId).toBeDefined();
    });
  });

  describe('getVeoVideoStatus', () => {
    it('should return queued status initially', async () => {
      const { jobId } = await generateVeoVideo(mockCredentials, mockRequest);
      const status = await getVeoVideoStatus(mockCredentials, jobId);

      expect(status).toHaveProperty('id', jobId);
      expect(['queued', 'processing', 'completed']).toContain(status.status);
    });

    it('should transition to processing status', async () => {
      const { jobId } = await generateVeoVideo(mockCredentials, mockRequest);

      // Wait for processing status
      await new Promise(resolve => setTimeout(resolve, 2500));

      const status = await getVeoVideoStatus(mockCredentials, jobId);
      expect(['processing', 'completed']).toContain(status.status);
    });

    it('should complete with video URL after 10 seconds', async () => {
      const { jobId } = await generateVeoVideo(mockCredentials, mockRequest);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 10500));

      const status = await getVeoVideoStatus(mockCredentials, jobId);
      expect(status.status).toBe('completed');
      expect(status.videoUrl).toBeDefined();
      expect(status.videoUrl).toContain('mock-veo-videos');
    });

    it('should return failed status for non-existent job', async () => {
      const status = await getVeoVideoStatus(mockCredentials, 'non-existent-job-id');

      expect(status.status).toBe('failed');
      expect(status.error).toBeDefined();
    });
  });

  describe('validateVeoCredentials', () => {
    it('should validate credentials in mock mode', async () => {
      const isValid = await validateVeoCredentials(mockCredentials);
      expect(isValid).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    // Disable mock mode to test error handling
    process.env.SORA_MOCK_MODE = 'false';
    process.env.VEO_MOCK_MODE = 'false';
  });

  describe('Sora Errors', () => {
    it('should handle invalid API key gracefully', async () => {
      const mockRequest: SoraGenerateRequest = {
        prompt: 'Test prompt',
        model: 'sora-2',
        size: '1280x720',
        seconds: 4
      };

      // This will fail with real API, but error should be handled
      try {
        await generateSoraVideo('invalid-key', mockRequest);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBeDefined();
      }
    });
  });

  describe('Veo Errors', () => {
    it('should handle invalid credentials gracefully', async () => {
      const mockRequest: VeoGenerateRequest = {
        prompt: 'Test prompt',
        model: 'veo-3.1-generate-preview',
        resolution: '720p',
        duration: 4,
        fps: 24
      };

      const badCredentials: GoogleCredentials = {
        projectId: 'invalid-project',
        apiKey: 'invalid-key'
      };

      // This will fail with real API, but error should be handled
      try {
        await generateVeoVideo(badCredentials, mockRequest);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBeDefined();
      }
    });
  });
});
