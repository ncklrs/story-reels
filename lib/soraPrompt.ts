import { v4 as uuidv4 } from 'uuid';
import { CharacterProfile, Scene, SoraPreset } from './types';
import { getPresetByKey } from './presets';

/**
 * Generate a unique identity tag for character consistency across scenes
 * Format: character:name-slug_id:uuid-prefix
 * Example: character:sarah-chen_id:a3f2b1c9
 */
export function generateIdentityTag(characterName: string): string {
  const slug = characterName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const uuidPrefix = uuidv4().split('-')[0];
  return `character:${slug}_id:${uuidPrefix}`;
}

/**
 * Build a character description from profile
 */
function buildCharacterDescription(character: CharacterProfile): string {
  const parts: string[] = [];

  if (character.identity_tag) {
    parts.push(character.identity_tag);
  }

  const details: string[] = [];

  if (character.age) details.push(`${character.age} years old`);
  if (character.gender) details.push(character.gender);
  if (character.ethnicity) details.push(character.ethnicity);
  if (character.physique) details.push(character.physique);
  if (character.face) details.push(character.face);
  if (character.hair) details.push(character.hair);
  if (character.clothing) details.push(`wearing ${character.clothing}`);
  if (character.signature_item) details.push(`with ${character.signature_item}`);

  if (details.length > 0) {
    parts.push(details.join(', '));
  }

  return parts.join('. ');
}

/**
 * Generate a Sora-optimized prompt from storyboard data
 * Following Sora best practices: style, subject, action, camera, lighting, palette, sound, duration
 */
export function makeSoraPrompt(
  scene: Scene,
  character: CharacterProfile,
  presetKey: string
): string {
  const preset = getPresetByKey(presetKey);

  if (!preset) {
    throw new Error(`Preset "${presetKey}" not found`);
  }

  const sections: string[] = [];

  // 1. Style
  sections.push(`Style: ${preset.style}.`);

  // 2. Subject (Character)
  const characterDesc = buildCharacterDescription(character);
  if (characterDesc) {
    sections.push(`Subject: ${characterDesc}.`);
  } else {
    sections.push(`Subject: ${scene.subject}.`);
  }

  // 3. Action
  sections.push(`Action: ${scene.action}.`);

  // 4. Camera
  const cameraDetails: string[] = [preset.camera.shot];
  if (preset.camera.lens) cameraDetails.push(preset.camera.lens);
  if (preset.camera.move) cameraDetails.push(preset.camera.move);
  sections.push(`Camera: ${cameraDetails.join(', ')}.`);

  // 5. Lighting
  if (preset.lighting) {
    sections.push(`Lighting: ${preset.lighting}.`);
  }

  // 6. Color Palette
  if (preset.palette && preset.palette.length > 0) {
    sections.push(`Palette: ${preset.palette.join(', ')}.`);
  }

  // 7. Sound
  if (preset.sound) {
    sections.push(`Sound: ${preset.sound}.`);
  }

  // 8. Duration
  sections.push(`Duration: ${scene.duration} seconds.`);

  return sections.join(' ');
}

/**
 * Validate a prompt meets Sora requirements
 */
export function validateSoraPrompt(prompt: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!prompt || prompt.trim().length === 0) {
    errors.push('Prompt cannot be empty');
  }

  if (prompt.length > 2000) {
    errors.push('Prompt exceeds 2000 character limit');
  }

  const requiredSections = ['Style:', 'Subject:', 'Action:', 'Camera:'];
  for (const section of requiredSections) {
    if (!prompt.includes(section)) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract duration from a prompt (for validation)
 */
export function extractDuration(prompt: string): number | null {
  const match = prompt.match(/Duration:\s*(\d+)\s*seconds/i);
  return match ? parseInt(match[1], 10) : null;
}
