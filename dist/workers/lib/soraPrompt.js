"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdentityTag = generateIdentityTag;
exports.makeSoraPrompt = makeSoraPrompt;
exports.validateSoraPrompt = validateSoraPrompt;
exports.extractDuration = extractDuration;
const uuid_1 = require("uuid");
const presets_1 = require("./presets");
/**
 * Generate a unique identity tag for character consistency across scenes
 * Format: character:name-slug_id:uuid-prefix
 * Example: character:sarah-chen_id:a3f2b1c9
 */
function generateIdentityTag(characterName) {
    const slug = characterName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const uuidPrefix = (0, uuid_1.v4)().split('-')[0];
    return `character:${slug}_id:${uuidPrefix}`;
}
/**
 * Build a character description from profile
 */
function buildCharacterDescription(character) {
    const parts = [];
    if (character.identity_tag) {
        parts.push(character.identity_tag);
    }
    const details = [];
    if (character.age)
        details.push(`${character.age} years old`);
    if (character.gender)
        details.push(character.gender);
    if (character.ethnicity)
        details.push(character.ethnicity);
    if (character.physique)
        details.push(character.physique);
    if (character.face)
        details.push(character.face);
    if (character.hair)
        details.push(character.hair);
    if (character.clothing)
        details.push(`wearing ${character.clothing}`);
    if (character.signature_item)
        details.push(`with ${character.signature_item}`);
    if (details.length > 0) {
        parts.push(details.join(', '));
    }
    return parts.join('. ');
}
/**
 * Generate a Sora-optimized prompt from storyboard data
 * Following Sora best practices: style, subject, action, camera, lighting, palette, sound, duration
 */
function makeSoraPrompt(scene, character, presetKey) {
    const preset = (0, presets_1.getPresetByKey)(presetKey);
    if (!preset) {
        throw new Error(`Preset "${presetKey}" not found`);
    }
    const sections = [];
    // 1. Style
    sections.push(`Style: ${preset.style}.`);
    // 2. Subject (Character)
    const characterDesc = buildCharacterDescription(character);
    if (characterDesc) {
        sections.push(`Subject: ${characterDesc}.`);
    }
    else {
        sections.push(`Subject: ${scene.subject}.`);
    }
    // 3. Action
    sections.push(`Action: ${scene.action}.`);
    // 4. Camera
    const cameraDetails = [preset.camera.shot];
    if (preset.camera.lens)
        cameraDetails.push(preset.camera.lens);
    if (preset.camera.move)
        cameraDetails.push(preset.camera.move);
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
function validateSoraPrompt(prompt) {
    const errors = [];
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
function extractDuration(prompt) {
    const match = prompt.match(/Duration:\s*(\d+)\s*seconds/i);
    return match ? parseInt(match[1], 10) : null;
}
//# sourceMappingURL=soraPrompt.js.map