'use client';

import { useState, useEffect } from 'react';

interface SceneTemplate {
  id: string;
  name: string;
  category: 'Action' | 'Dialogue' | 'Transition' | 'Establishing' | 'Close-up';
  description: string;
  emoji: string;
  subject: string;
  action: string;
  duration: 4 | 8 | 12;
}

interface SceneTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

const SCENE_TEMPLATES: SceneTemplate[] = [
  // Action
  {
    id: 'action-chase',
    name: 'Chase Scene',
    category: 'Action',
    description: 'High-energy pursuit with dynamic camera movement',
    emoji: '🏃',
    subject: 'Character',
    action: 'running through crowded street, dodging obstacles, camera following close behind with handheld movement',
    duration: 8,
  },
  {
    id: 'action-fight',
    name: 'Fight Sequence',
    category: 'Action',
    description: 'Intense combat with quick cuts and dramatic angles',
    emoji: '👊',
    subject: 'Character',
    action: 'engaged in hand-to-hand combat, wide shot capturing full choreography, dramatic side lighting',
    duration: 8,
  },
  {
    id: 'action-explosion',
    name: 'Explosion',
    category: 'Action',
    description: 'Dramatic explosion with slow-motion effect',
    emoji: '💥',
    subject: 'Character',
    action: 'walking away from explosion in slow motion, dramatic backlighting, debris flying past',
    duration: 4,
  },

  // Dialogue
  {
    id: 'dialogue-closeup',
    name: 'Emotional Dialogue',
    category: 'Dialogue',
    description: 'Intimate conversation with close-up shots',
    emoji: '💬',
    subject: 'Character',
    action: 'speaking with intense emotion, close-up on face, soft natural lighting, shallow depth of field',
    duration: 8,
  },
  {
    id: 'dialogue-twoshot',
    name: 'Two-Shot Conversation',
    category: 'Dialogue',
    description: 'Two characters in frame during conversation',
    emoji: '👥',
    subject: 'Character',
    action: 'in conversation with another person, medium two-shot, neutral eye-level camera, natural lighting',
    duration: 8,
  },
  {
    id: 'dialogue-phone',
    name: 'Phone Call',
    category: 'Dialogue',
    description: 'Character on phone with emotional reaction',
    emoji: '📱',
    subject: 'Character',
    action: 'listening to phone call, close-up on face showing emotional reaction, dramatic side lighting',
    duration: 4,
  },

  // Transition
  {
    id: 'transition-walk',
    name: 'Walking Transition',
    category: 'Transition',
    description: 'Character walking to new location',
    emoji: '🚶',
    subject: 'Character',
    action: 'walking through environment, tracking shot following from side, natural lighting',
    duration: 4,
  },
  {
    id: 'transition-door',
    name: 'Through the Door',
    category: 'Transition',
    description: 'Entering or exiting through doorway',
    emoji: '🚪',
    subject: 'Character',
    action: 'entering through doorway, camera pushing in, transitional lighting from dark to light',
    duration: 4,
  },
  {
    id: 'transition-vehicle',
    name: 'Vehicle Travel',
    category: 'Transition',
    description: 'Character traveling in vehicle',
    emoji: '🚗',
    subject: 'Character',
    action: 'sitting in moving vehicle looking out window, side profile shot, natural window lighting',
    duration: 8,
  },

  // Establishing
  {
    id: 'establishing-cityscape',
    name: 'City Establishing',
    category: 'Establishing',
    description: 'Wide shot of urban environment',
    emoji: '🏙️',
    subject: 'Character',
    action: 'standing in urban environment, wide establishing shot, golden hour lighting, drone perspective',
    duration: 4,
  },
  {
    id: 'establishing-interior',
    name: 'Interior Establishing',
    category: 'Establishing',
    description: 'Wide shot revealing interior space',
    emoji: '🏠',
    subject: 'Character',
    action: 'in interior space, wide establishing shot showing full environment, ambient lighting',
    duration: 4,
  },
  {
    id: 'establishing-nature',
    name: 'Nature Establishing',
    category: 'Establishing',
    description: 'Character in natural environment',
    emoji: '🌲',
    subject: 'Character',
    action: 'in natural outdoor setting, wide drone shot revealing landscape, golden hour natural lighting',
    duration: 8,
  },

  // Close-up
  {
    id: 'closeup-eyes',
    name: 'Eyes Close-up',
    category: 'Close-up',
    description: 'Extreme close-up on eyes showing emotion',
    emoji: '👁️',
    subject: 'Character',
    action: 'eyes filling frame showing emotional intensity, extreme close-up, dramatic key lighting',
    duration: 4,
  },
  {
    id: 'closeup-hands',
    name: 'Hands Close-up',
    category: 'Close-up',
    description: 'Close-up of hands performing action',
    emoji: '✋',
    subject: 'Character',
    action: 'hands performing detailed action, macro close-up, focused practical lighting',
    duration: 4,
  },
  {
    id: 'closeup-object',
    name: 'Object Reveal',
    category: 'Close-up',
    description: 'Close-up of important object',
    emoji: '💎',
    subject: 'Character',
    action: 'holding significant object, close-up on object with shallow focus, dramatic lighting highlighting details',
    duration: 4,
  },
];

const CATEGORIES: Array<'Action' | 'Dialogue' | 'Transition' | 'Establishing' | 'Close-up'> = [
  'Action',
  'Dialogue',
  'Transition',
  'Establishing',
  'Close-up',
];

export default function SceneTemplateSelector({
  isOpen,
  onClose,
  onSelectTemplate,
}: SceneTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter templates
  const filteredTemplates = SCENE_TEMPLATES.filter((template) => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (templateId: string) => {
    onSelectTemplate(templateId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="template-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Scene Templates
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  No templates found
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Try adjusting your search or filters
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{template.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {template.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{template.duration}s</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Select a template to add it to your storyboard
          </p>
        </div>
      </div>
    </div>
  );
}

// Export template data for use in parent components
export { SCENE_TEMPLATES };
export type { SceneTemplate };
