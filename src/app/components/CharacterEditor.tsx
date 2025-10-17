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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Character Profile</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={character.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Sarah Chen"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Age</label>
          <input
            type="number"
            value={character.age || ''}
            onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="28"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <input
            type="text"
            value={character.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Female"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ethnicity</label>
          <input
            type="text"
            value={character.ethnicity || ''}
            onChange={(e) => handleInputChange('ethnicity', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Asian American"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Physique</label>
          <input
            type="text"
            value={character.physique || ''}
            onChange={(e) => handleInputChange('physique', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Athletic build"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Face</label>
          <input
            type="text"
            value={character.face || ''}
            onChange={(e) => handleInputChange('face', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Round face, warm smile"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hair</label>
          <input
            type="text"
            value={character.hair || ''}
            onChange={(e) => handleInputChange('hair', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Long black hair in ponytail"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Clothing</label>
          <input
            type="text"
            value={character.clothing || ''}
            onChange={(e) => handleInputChange('clothing', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Business casual attire"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Signature Item</label>
          <input
            type="text"
            value={character.signature_item || ''}
            onChange={(e) => handleInputChange('signature_item', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Red leather briefcase"
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
