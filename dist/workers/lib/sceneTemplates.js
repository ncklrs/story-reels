"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENE_TEMPLATES = void 0;
exports.getTemplatesByCategory = getTemplatesByCategory;
exports.getTemplateCategories = getTemplateCategories;
exports.createSceneFromTemplate = createSceneFromTemplate;
exports.getTemplateById = getTemplateById;
const uuid_1 = require("uuid");
/**
 * Common scene templates for quick storyboard creation
 */
exports.SCENE_TEMPLATES = [
    {
        id: 'establishing-wide',
        name: 'Establishing Shot - Wide',
        description: 'Wide exterior shot to establish location',
        subject: 'A wide view of the location',
        action: 'The camera slowly pans across the scene, revealing the environment',
        duration: 8,
        category: 'establishing',
    },
    {
        id: 'establishing-aerial',
        name: 'Establishing Shot - Aerial',
        description: 'Aerial drone shot of location',
        subject: 'An aerial view of the location',
        action: 'The camera flies over the scene from above, gradually descending',
        duration: 8,
        category: 'establishing',
    },
    {
        id: 'character-intro',
        name: 'Character Introduction',
        description: 'Medium shot introducing a character',
        subject: 'A character standing in the environment',
        action: 'The character looks around, then walks toward the camera with confidence',
        duration: 8,
        category: 'character',
    },
    {
        id: 'character-closeup',
        name: 'Character Close-up',
        description: 'Emotional close-up of character',
        subject: 'A close-up of the character\'s face',
        action: 'The character\'s expression changes from neutral to determined',
        duration: 4,
        category: 'closeup',
    },
    {
        id: 'character-walking',
        name: 'Character Walking',
        description: 'Character walking through environment',
        subject: 'A character walking through the scene',
        action: 'They walk purposefully, looking around at their surroundings',
        duration: 8,
        category: 'character',
    },
    {
        id: 'action-chase',
        name: 'Action - Chase',
        description: 'High-energy chase sequence',
        subject: 'A character running through the environment',
        action: 'They sprint forward, dodging obstacles and looking back urgently',
        duration: 8,
        category: 'action',
    },
    {
        id: 'action-fight',
        name: 'Action - Fight',
        description: 'Dynamic fight sequence',
        subject: 'Two characters in combat',
        action: 'They exchange blows in rapid succession, moving dynamically',
        duration: 8,
        category: 'action',
    },
    {
        id: 'action-explosion',
        name: 'Action - Explosion',
        description: 'Dramatic explosion scene',
        subject: 'An object or structure',
        action: 'It explodes in a burst of fire and debris, with dramatic lighting',
        duration: 4,
        category: 'action',
    },
    {
        id: 'dialogue-twoshot',
        name: 'Dialogue - Two Shot',
        description: 'Two characters in conversation',
        subject: 'Two characters facing each other',
        action: 'They engage in conversation, with subtle gestures and reactions',
        duration: 8,
        category: 'dialogue',
    },
    {
        id: 'dialogue-overShoulder',
        name: 'Dialogue - Over Shoulder',
        description: 'Over-the-shoulder conversation shot',
        subject: 'A character speaking, viewed over another\'s shoulder',
        action: 'The character speaks earnestly while the other listens',
        duration: 8,
        category: 'dialogue',
    },
    {
        id: 'transition-fade',
        name: 'Transition - Ambient',
        description: 'Ambient transition shot',
        subject: 'A peaceful environmental element (clouds, water, trees)',
        action: 'The scene moves gently with natural motion',
        duration: 4,
        category: 'transition',
    },
    {
        id: 'transition-travel',
        name: 'Transition - Travel',
        description: 'Travel montage shot',
        subject: 'A vehicle or character in motion',
        action: 'They move through the landscape in a continuous journey',
        duration: 8,
        category: 'transition',
    },
    {
        id: 'closeup-object',
        name: 'Close-up - Object',
        description: 'Detailed close-up of important object',
        subject: 'An important object in sharp focus',
        action: 'The camera slowly pushes in on the object, revealing details',
        duration: 4,
        category: 'closeup',
    },
    {
        id: 'closeup-hands',
        name: 'Close-up - Hands',
        description: 'Close-up of hands performing action',
        subject: 'A pair of hands',
        action: 'The hands carefully perform a detailed action',
        duration: 4,
        category: 'closeup',
    },
];
/**
 * Get scene templates by category
 */
function getTemplatesByCategory(category) {
    return exports.SCENE_TEMPLATES.filter(template => template.category === category);
}
/**
 * Get all template categories
 */
function getTemplateCategories() {
    const categories = [
        { key: 'establishing', label: 'Establishing Shots' },
        { key: 'character', label: 'Character Scenes' },
        { key: 'action', label: 'Action Sequences' },
        { key: 'dialogue', label: 'Dialogue Scenes' },
        { key: 'transition', label: 'Transitions' },
        { key: 'closeup', label: 'Close-ups' },
    ];
    return categories.map(cat => ({
        ...cat,
        count: exports.SCENE_TEMPLATES.filter(t => t.category === cat.key).length,
    }));
}
/**
 * Create a scene from a template
 */
function createSceneFromTemplate(template) {
    return {
        id: (0, uuid_1.v4)(),
        subject: template.subject,
        action: template.action,
        duration: template.duration,
    };
}
/**
 * Find template by ID
 */
function getTemplateById(templateId) {
    return exports.SCENE_TEMPLATES.find(t => t.id === templateId);
}
//# sourceMappingURL=sceneTemplates.js.map