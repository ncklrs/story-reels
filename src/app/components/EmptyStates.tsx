'use client';

/**
 * Props for generic EmptyState component
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Generic empty state component
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4" role="status" aria-live="polite">
      {icon && (
        <div className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for when no scenes exist yet
 */
export function NoScenesYet({ onAddScene }: { onAddScene: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      }
      title="No scenes yet"
      description="Get started by adding your first scene or choosing a template to begin your video storyboard."
      action={{
        label: '+ Add Your First Scene',
        onClick: onAddScene,
      }}
    />
  );
}

/**
 * Empty state for when a scene has no video generated
 */
export function NoVideoYet() {
  return (
    <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400 px-4">
        <svg
          className="mx-auto h-12 w-12 mb-3 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm font-medium">No video generated yet</p>
        <p className="text-xs mt-1">Click "Generate Video" to create this scene</p>
      </div>
    </div>
  );
}

/**
 * Empty state for storyboard list (future feature)
 */
export function NoStoryboardsYet({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      }
      title="No storyboards yet"
      description="Create your first storyboard to start generating AI videos with Sora and Veo."
      action={{
        label: '+ Create New Storyboard',
        onClick: onCreateNew,
      }}
    />
  );
}

/**
 * Empty state for search results
 */
export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No results found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        We could not find any results for <span className="font-semibold">"{query}"</span>
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for saved items / favorites
 */
export function NoSavedItems({ itemType = 'items' }: { itemType?: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      }
      title={`No saved ${itemType}`}
      description={`You have not saved any ${itemType} yet. Start saving to see them here.`}
    />
  );
}

/**
 * Empty state for completed videos
 */
export function NoCompletedVideos() {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No completed videos yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
        Generate videos for your scenes to see them compiled here.
      </p>
    </div>
  );
}

/**
 * Empty state for when data is loading (optional, could use skeleton instead)
 */
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="text-center py-12 px-4" role="status" aria-live="polite">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" aria-hidden="true"></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}

/**
 * Empty state for error / failed state
 */
export function FailedState({
  title = 'Something went wrong',
  message = 'We encountered an error. Please try again.',
  onRetry
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-16 h-16 text-red-400 dark:text-red-500 mb-4 flex items-center justify-center">
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
