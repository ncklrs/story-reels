'use client';

import { useState, useRef, useEffect } from 'react';

interface TemplatesMenuProps {
  onQuickStart: () => void;
  onSaveAsTemplate: () => void;
  onMyTemplates: () => void;
}

export default function TemplatesMenu({
  onQuickStart,
  onSaveAsTemplate,
  onMyTemplates,
}: TemplatesMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors duration-200 shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Template Icon */}
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
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
          />
        </svg>
        Templates
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
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-2">
            {/* Quick Start Templates */}
            <button
              onClick={() => handleSelect(onQuickStart)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-start gap-3"
            >
              {/* Lightning Icon */}
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Quick Start Templates
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full">
                    NEW
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Pre-built storyboards to get started fast
                </p>
              </div>
            </button>

            {/* Save as Template */}
            <button
              onClick={() => handleSelect(onSaveAsTemplate)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-start gap-3"
            >
              {/* Save Icon */}
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Save as Template
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                    Save
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Save current storyboard as a reusable template
                </p>
              </div>
            </button>

            {/* My Templates */}
            <button
              onClick={() => handleSelect(onMyTemplates)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-start gap-3"
            >
              {/* Library Icon */}
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    My Templates
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                    Library
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Browse and load your saved templates
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
