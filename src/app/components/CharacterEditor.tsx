'use client';

import { CharacterProfile } from '@/lib/types';
import { generateIdentityTag } from '@/lib/soraPrompt';

interface CharacterEditorProps {
  character: CharacterProfile;
  onChange: (character: CharacterProfile) => void;
}

export default function CharacterEditor({ character, onChange }: CharacterEditorProps) {
  const handleInputChange = (field: keyof CharacterProfile, value: any) => {
    const updated = { ...character, [field]: value };

    // Auto-generate identity tag when name changes
    if (field === 'name' && value) {
      updated.identity_tag = generateIdentityTag(value);
    }

    onChange(updated);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white" id="character-profile-heading">
        Character Profile
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-labelledby="character-profile-heading">
        <div>
          <label htmlFor="character-name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            id="character-name"
            type="text"
            value={character.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Sarah Chen"
            aria-describedby="character-name-hint"
            aria-required="true"
          />
          <span id="character-name-hint" className="sr-only">
            Enter the character's full name for consistent identity across scenes
          </span>
        </div>

        <div>
          <label htmlFor="character-age" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Age
          </label>
          <input
            id="character-age"
            type="number"
            value={character.age || ''}
            onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="28"
            min="1"
            max="120"
            aria-label="Character age"
          />
        </div>

        <div>
          <label htmlFor="character-gender" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Gender
          </label>
          <input
            id="character-gender"
            type="text"
            value={character.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Female"
            aria-label="Character gender"
          />
        </div>

        <div>
          <label htmlFor="character-ethnicity" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Ethnicity
          </label>
          <input
            id="character-ethnicity"
            type="text"
            value={character.ethnicity || ''}
            onChange={(e) => handleInputChange('ethnicity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Asian American"
            aria-label="Character ethnicity"
          />
        </div>

        <div>
          <label htmlFor="character-physique" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Physique
          </label>
          <input
            id="character-physique"
            type="text"
            value={character.physique || ''}
            onChange={(e) => handleInputChange('physique', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Athletic build"
            aria-label="Character physique"
          />
        </div>

        <div>
          <label htmlFor="character-face" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Face
          </label>
          <input
            id="character-face"
            type="text"
            value={character.face || ''}
            onChange={(e) => handleInputChange('face', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Round face, warm smile"
            aria-label="Character face description"
          />
        </div>

        <div>
          <label htmlFor="character-hair" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Hair
          </label>
          <input
            id="character-hair"
            type="text"
            value={character.hair || ''}
            onChange={(e) => handleInputChange('hair', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Long black hair in ponytail"
            aria-label="Character hair description"
          />
        </div>

        <div>
          <label htmlFor="character-clothing" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Clothing
          </label>
          <input
            id="character-clothing"
            type="text"
            value={character.clothing || ''}
            onChange={(e) => handleInputChange('clothing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Business casual attire"
            aria-label="Character clothing description"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="character-signature" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Signature Item
          </label>
          <input
            id="character-signature"
            type="text"
            value={character.signature_item || ''}
            onChange={(e) => handleInputChange('signature_item', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Red leather briefcase"
            aria-label="Character signature item"
          />
        </div>

        {character.identity_tag && (
          <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <label className="block text-sm font-medium mb-1">Identity Tag (Auto-generated)</label>
            <code className="text-sm text-blue-600 dark:text-blue-400">{character.identity_tag}</code>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              This tag ensures character consistency across scenes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
