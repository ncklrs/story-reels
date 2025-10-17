'use client';

interface GuestBannerProps {
  onSignInClick: () => void;
}

export default function GuestBanner({ onSignInClick }: GuestBannerProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        {/* Info Icon */}
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
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Guest Mode
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            Your storyboard is saved locally in your browser. Sign in to sync
            your work across devices and unlock cloud storage for your videos.
          </p>
        </div>

        {/* Sign In Button */}
        <button
          onClick={onSignInClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex-shrink-0"
          aria-label="Sign in to save your work"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
