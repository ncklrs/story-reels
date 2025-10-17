'use client';

import { SORA_PRESETS } from '@/lib/presets';

interface PresetSelectorProps {
  selectedPresetKey: string;
  onChange: (presetKey: string) => void;
}

export default function PresetSelector({ selectedPresetKey, onChange }: PresetSelectorProps) {
  const selectedPreset = SORA_PRESETS.find(p => p.key === selectedPresetKey);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Visual Preset</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Style</label>
        <select
          value={selectedPresetKey}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        >
          {SORA_PRESETS.map(preset => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {selectedPreset && (
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Style:</span> {selectedPreset.style}
          </div>
          <div>
            <span className="font-medium">Camera:</span>{' '}
            {[
              selectedPreset.camera.shot,
              selectedPreset.camera.lens,
              selectedPreset.camera.move
            ].filter(Boolean).join(', ')}
          </div>
          {selectedPreset.lighting && (
            <div>
              <span className="font-medium">Lighting:</span> {selectedPreset.lighting}
            </div>
          )}
          {selectedPreset.palette && selectedPreset.palette.length > 0 && (
            <div>
              <span className="font-medium">Palette:</span>
              <div className="flex gap-2 mt-1">
                {selectedPreset.palette.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          {selectedPreset.sound && (
            <div>
              <span className="font-medium">Sound:</span> {selectedPreset.sound}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
