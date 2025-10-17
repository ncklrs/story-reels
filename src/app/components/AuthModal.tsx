'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useToast } from './ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}

type AuthMode = 'signin' | 'signup';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setErrors({});
    }
  }, [isOpen, mode]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Sign up specific validation
    if (mode === 'signup') {
      if (!name) {
        newErrors.name = 'Name is required';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual authentication API call
      // For now, simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (mode === 'signin') {
        // Mock sign in success
        const mockUser = {
          id: 'user-123',
          email,
          name: email.split('@')[0],
        };

        showToast('Successfully signed in!', 'success');
        onSuccess?.(mockUser);
        onClose();
      } else {
        // Mock sign up success
        const mockUser = {
          id: 'user-123',
          email,
          name,
        };

        showToast('Account created successfully!', 'success');
        onSuccess?.(mockUser);
        onClose();
      }
    } catch (error: any) {
      showToast(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMode('signin')}
              className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                mode === 'signin'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={mode === 'signin' ? 'page' : undefined}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                mode === 'signup'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={mode === 'signup' ? 'page' : undefined}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="John Doe"
                  disabled={isLoading}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete={mode === 'signin' ? 'email' : 'email'}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : 'password-hint'}
              />
              {errors.password ? (
                <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.password}
                </p>
              ) : mode === 'signup' ? (
                <p id="password-hint" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Must be at least 8 characters
                </p>
              ) : null}
            </div>

            {/* Confirm Password field (signup only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          {mode === 'signin' && (
            <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                disabled={isLoading}
              >
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                disabled={isLoading}
              >
                Sign in
              </button>
            </p>
          )}

          {/* Development note */}
          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Development Mode:</strong> This is a mock authentication UI. Connect to your auth provider (NextAuth, Clerk, Supabase, etc.) to enable real authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
