'use client';

import { ReactNode, useState } from 'react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  headerActions?: ReactNode;
}

export default function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
  headerActions,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Chevron Icon */}
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
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
              d="M9 5l7 7-7 7"
            />
          </svg>

          {/* Title and Subtitle */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        {headerActions && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          {children}
        </div>
      )}
    </div>
  );
}
