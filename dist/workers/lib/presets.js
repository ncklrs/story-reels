"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SORA_PRESETS = void 0;
exports.getPresetByKey = getPresetByKey;
exports.getDefaultPreset = getDefaultPreset;
exports.SORA_PRESETS = [
    {
        key: 'cinematic',
        label: 'Cinematic',
        style: 'Cinematic film, 35mm',
        camera: {
            shot: 'Medium shot',
            lens: '35mm',
            move: 'Slow dolly in'
        },
        lighting: 'Moody, low-key lighting with dramatic shadows',
        palette: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
        sound: 'Atmospheric score with deep bass'
    },
    {
        key: 'documentary',
        label: 'Documentary',
        style: 'Documentary style, handheld camera',
        camera: {
            shot: 'Wide shot',
            lens: 'Wide angle',
            move: 'Handheld, natural movement'
        },
        lighting: 'Natural lighting, soft and realistic',
        palette: ['#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161'],
        sound: 'Ambient sound, natural audio'
    },
    {
        key: 'commercial',
        label: 'Commercial',
        style: 'High-end commercial, professional lighting',
        camera: {
            shot: 'Close-up to medium',
            lens: '50mm',
            move: 'Smooth tracking shot'
        },
        lighting: 'Studio lighting, bright and vibrant',
        palette: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7fff7'],
        sound: 'Upbeat, energetic music'
    },
    {
        key: 'vlog',
        label: 'Vlog',
        style: 'Casual vlog style, personal perspective',
        camera: {
            shot: 'First person POV',
            lens: 'Wide angle',
            move: 'Handheld, dynamic'
        },
        lighting: 'Natural daylight, soft fill',
        palette: ['#ffeaa7', '#fdcb6e', '#6c5ce7', '#a29bfe'],
        sound: 'Casual, conversational tone'
    },
    {
        key: 'horror',
        label: 'Horror',
        style: 'Dark, suspenseful horror aesthetic',
        camera: {
            shot: 'Low angle',
            lens: 'Wide angle',
            move: 'Slow creeping push'
        },
        lighting: 'Low-key, harsh shadows, dim ambient',
        palette: ['#000000', '#1a1a1a', '#330000', '#660000'],
        sound: 'Eerie ambient, tension-building score'
    },
    {
        key: 'anime',
        label: 'Anime',
        style: 'Anime-inspired, vibrant colors',
        camera: {
            shot: 'Dynamic angles',
            lens: 'Varied',
            move: 'Quick cuts, energetic'
        },
        lighting: 'High contrast, vibrant colors',
        palette: ['#ff6b9d', '#c44569', '#f8b500', '#00d2ff'],
        sound: 'J-pop or orchestral anime soundtrack'
    },
    {
        key: 'vintage',
        label: 'Vintage',
        style: 'Vintage film, grainy texture',
        camera: {
            shot: 'Classic framing',
            lens: '50mm',
            move: 'Static or slow pan'
        },
        lighting: 'Warm, nostalgic lighting',
        palette: ['#d4a574', '#a67c52', '#8b6f47', '#6b5638'],
        sound: 'Vintage jazz or classical'
    },
    {
        key: 'scifi',
        label: 'Sci-Fi',
        style: 'Futuristic sci-fi, sleek design',
        camera: {
            shot: 'Wide establishing shots',
            lens: 'Anamorphic',
            move: 'Slow reveal, epic scale'
        },
        lighting: 'Neon accents, cool tones, dramatic contrast',
        palette: ['#00ffff', '#0080ff', '#8000ff', '#1a1a2e'],
        sound: 'Electronic, synthesized soundscape'
    },
    {
        key: 'nature',
        label: 'Nature Documentary',
        style: 'Nature documentary, ultra-realistic',
        camera: {
            shot: 'Macro to wide landscape',
            lens: 'Telephoto and wide',
            move: 'Slow pan, stabilized'
        },
        lighting: 'Golden hour, natural sunlight',
        palette: ['#2ecc71', '#27ae60', '#16a085', '#f39c12'],
        sound: 'Natural ambient sounds, subtle orchestral'
    },
    {
        key: 'action',
        label: 'Action',
        style: 'High-octane action, dynamic movement',
        camera: {
            shot: 'Fast-paced cuts',
            lens: 'Wide and telephoto mix',
            move: 'Quick pans, crash zooms'
        },
        lighting: 'High contrast, dramatic lighting',
        palette: ['#ff4757', '#ff6348', '#ffa502', '#1e272e'],
        sound: 'Intense percussion, driving beat'
    }
];
function getPresetByKey(key) {
    return exports.SORA_PRESETS.find(preset => preset.key === key);
}
function getDefaultPreset() {
    return exports.SORA_PRESETS[0]; // Cinematic
}
//# sourceMappingURL=presets.js.map