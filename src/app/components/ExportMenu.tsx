'use client';

import { useState, useRef, useEffect } from 'react';
import { Storyboard } from '../../../lib/types';

interface ExportMenuProps {
  storyboard: Storyboard;
  preset: any;
  hasGeneratedVideos: boolean;
  completedScenes: number;
  isCompiled: boolean;
  onExport: (format: string) => Promise<void>;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
  category: 'project' | 'video' | 'documentation';
}

export default function ExportMenu({
  storyboard,
  preset,
  hasGeneratedVideos,
  completedScenes,
  isCompiled,
  onExport,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const exportOptions: ExportOption[] = [
    // Project Data
    {
      id: 'json',
      label: 'JSON',
      description: 'Complete project data',
      badge: 'DATA',
      badgeColor: 'bg-blue-500',
      category: 'project',
    },
    {
      id: 'markdown',
      label: 'Markdown',
      description: 'Human-readable format',
      badge: 'MD',
      badgeColor: 'bg-indigo-500',
      category: 'project',
    },
    {
      id: 'yaml',
      label: 'YAML',
      description: 'Configuration format',
      badge: 'YAML',
      badgeColor: 'bg-purple-500',
      category: 'project',
    },
    {
      id: 'xml',
      label: 'XML',
      description: 'Structured data',
      badge: 'XML',
      badgeColor: 'bg-pink-500',
      category: 'project',
    },
    // Video Files
    {
      id: 'all-videos-zip',
      label: 'All Scene Videos',
      description: `Download ${completedScenes} scene(s) as ZIP`,
      badge: 'ZIP',
      badgeColor: 'bg-green-500',
      category: 'video',
    },
    {
      id: 'compiled-video',
      label: 'Compiled Video',
      description: 'Final assembled video',
      badge: 'MP4',
      badgeColor: 'bg-green-600',
      category: 'video',
    },
    // Documentation
    {
      id: 'csv',
      label: 'CSV',
      description: 'Scene data spreadsheet',
      badge: 'CSV',
      badgeColor: 'bg-orange-500',
      category: 'documentation',
    },
    {
      id: 'screenplay',
      label: 'Script/Screenplay',
      description: 'Formatted screenplay',
      badge: 'TXT',
      badgeColor: 'bg-teal-500',
      category: 'documentation',
    },
    {
      id: 'pdf',
      label: 'PDF Report',
      description: 'Complete storyboard PDF',
      badge: 'PDF',
      badgeColor: 'bg-red-500',
      category: 'documentation',
    },
  ];

  const handleExport = async (formatId: string) => {
    try {
      setLoading(formatId);
      await onExport(formatId);
    } finally {
      setLoading(null);
      setIsOpen(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'project':
        return 'PROJECT DATA';
      case 'video':
        return 'VIDEO FILES';
      case 'documentation':
        return 'DOCUMENTATION';
      default:
        return category.toUpperCase();
    }
  };

  const groupedOptions = exportOptions.reduce(
    (acc, option) => {
      acc[option.category] = acc[option.category] || [];
      acc[option.category].push(option);
      return acc;
    },
    {} as Record<string, ExportOption[]>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-200 shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Download Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export
        {/* Chevron */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="py-2">
            {/* Project Data */}
            <div className="px-3 py-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {getCategoryLabel('project')}
              </h4>
            </div>
            {groupedOptions.project?.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={loading === option.id}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={`px-2 py-1 text-xs font-bold ${option.badgeColor} text-white rounded`}
                >
                  {option.badge}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
                {loading === option.id && (
                  <svg
                    className="animate-spin h-4 w-4 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </button>
            ))}

            {/* Video Files */}
            {hasGeneratedVideos && (
              <>
                <div className="px-3 py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {getCategoryLabel('video')}
                  </h4>
                </div>
                {groupedOptions.video?.map((option) => {
                  const isDisabled =
                    (option.id === 'all-videos-zip' && completedScenes === 0) ||
                    (option.id === 'compiled-video' && !isCompiled);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleExport(option.id)}
                      disabled={loading === option.id || isDisabled}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span
                        className={`px-2 py-1 text-xs font-bold ${option.badgeColor} text-white rounded`}
                      >
                        {option.badge}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {loading === option.id && (
                        <svg
                          className="animate-spin h-4 w-4 text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* Documentation */}
            <div className="px-3 py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {getCategoryLabel('documentation')}
              </h4>
            </div>
            {groupedOptions.documentation?.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={loading === option.id}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={`px-2 py-1 text-xs font-bold ${option.badgeColor} text-white rounded`}
                >
                  {option.badge}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
                {loading === option.id && (
                  <svg
                    className="animate-spin h-4 w-4 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
