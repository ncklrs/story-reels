import { describe, it, expect } from 'vitest';
import { generateIdentityTag, makeSoraPrompt, validateSoraPrompt, extractDuration } from '../lib/soraPrompt';
import { CharacterProfile, Scene } from '../lib/types';

describe('generateIdentityTag', () => {
  it('should generate a valid identity tag', () => {
    const tag = generateIdentityTag('Sarah Chen');
    expect(tag).toMatch(/^character:sarah-chen_id:[a-f0-9]{8}$/);
  });

  it('should handle names with special characters', () => {
    const tag = generateIdentityTag("O'Brien-Smith");
    expect(tag).toMatch(/^character:o-brien-smith_id:[a-f0-9]{8}$/);
  });
});

describe('makeSoraPrompt', () => {
  const character: CharacterProfile = {
    id: '1',
    name: 'Sarah Chen',
    age: 28,
    gender: 'Female',
    identity_tag: 'character:sarah-chen_id:a3f2b1c9'
  };

  const scene: Scene = {
    id: '1',
    subject: 'A woman',
    action: 'walking through a city street',
    duration: 8
  };

  it('should generate a valid prompt with all sections', () => {
    const prompt = makeSoraPrompt(scene, character, 'cinematic');

    expect(prompt).toContain('Style:');
    expect(prompt).toContain('Subject:');
    expect(prompt).toContain('Action:');
    expect(prompt).toContain('Camera:');
    expect(prompt).toContain('Duration: 8 seconds');
  });

  it('should include character identity tag', () => {
    const prompt = makeSoraPrompt(scene, character, 'cinematic');
    expect(prompt).toContain('character:sarah-chen_id:a3f2b1c9');
  });

  it('should throw error for invalid preset', () => {
    expect(() => makeSoraPrompt(scene, character, 'invalid-preset')).toThrow();
  });
});

describe('validateSoraPrompt', () => {
  it('should validate a correct prompt', () => {
    const prompt = 'Style: Cinematic. Subject: A woman. Action: walking. Camera: Medium shot.';
    const result = validateSoraPrompt(prompt);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty prompt', () => {
    const result = validateSoraPrompt('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect missing required sections', () => {
    const prompt = 'Style: Cinematic. Action: walking.';
    const result = validateSoraPrompt(prompt);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Subject'))).toBe(true);
  });
});

describe('extractDuration', () => {
  it('should extract duration from prompt', () => {
    const prompt = 'Some text. Duration: 8 seconds. More text.';
    expect(extractDuration(prompt)).toBe(8);
  });

  it('should return null if duration not found', () => {
    const prompt = 'Some text without duration.';
    expect(extractDuration(prompt)).toBeNull();
  });
});
