'use client';

import { useState } from 'react';
import { useCostTracking } from '@/app/hooks/useCostTracking';
import { Scene } from '@/lib/types';

interface CostTrackerProps {
  storyboardId: string;
  scenes: Scene[];
}

export default function CostTracker({ storyboardId, scenes }: CostTrackerProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  const {
    totalSpent,
    budgetLimit,
    setBudgetLimit,
    estimatedTotal,
    remainingBudget,
    isOverBudget,
    isNearBudget,
    costBreakdown,
    pendingCost,
    completedCost,
  } = useCostTracking(storyboardId, scenes);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Handle budget update
  const handleBudgetUpdate = () => {
    const amount = parseFloat(budgetInput);
    if (!isNaN(amount) && amount > 0) {
      setBudgetLimit(amount);
      setIsEditingBudget(false);
      setBudgetInput('');
    }
  };

  // Handle budget removal
  const handleBudgetRemove = () => {
    setBudgetLimit(null);
    setIsEditingBudget(false);
    setBudgetInput('');
  };

  // Calculate progress percentage
  const budgetProgress = budgetLimit ? (completedCost / budgetLimit) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Cost Tracking</h3>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showBreakdown ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Budget Warnings */}
      {isOverBudget && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <div className="flex items-center text-red-800 dark:text-red-200">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">Budget Exceeded!</span>
          </div>
        </div>
      )}

      {isNearBudget && !isOverBudget && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <div className="flex items-center text-yellow-800 dark:text-yellow-200">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">Approaching Budget Limit</span>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Spent
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(completedCost)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Pending Cost
          </span>
          <span className="text-md font-semibold text-gray-700 dark:text-gray-300">
            {formatCurrency(pendingCost)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Estimated Total
          </span>
          <span className="text-md font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(estimatedTotal)}
          </span>
        </div>
      </div>

      {/* Budget Limit */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
        {!isEditingBudget && budgetLimit === null && (
          <button
            onClick={() => setIsEditingBudget(true)}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Set Budget Limit
          </button>
        )}

        {!isEditingBudget && budgetLimit !== null && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Budget Limit</span>
              <div className="flex items-center gap-2">
                <span className="text-md font-bold">{formatCurrency(budgetLimit)}</span>
                <button
                  onClick={() => {
                    setBudgetInput(budgetLimit.toString());
                    setIsEditingBudget(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOverBudget
                    ? 'bg-red-600'
                    : isNearBudget
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{budgetProgress.toFixed(0)}% used</span>
              {remainingBudget !== null && (
                <span>
                  {remainingBudget > 0
                    ? `${formatCurrency(remainingBudget)} remaining`
                    : `${formatCurrency(Math.abs(remainingBudget))} over`}
                </span>
              )}
            </div>
          </div>
        )}

        {isEditingBudget && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Budget Limit ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="e.g., 100.00"
                className="flex-1 px-3 py-1 text-sm border rounded-md"
                step="0.01"
                min="0"
              />
              <button
                onClick={handleBudgetUpdate}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingBudget(false);
                  setBudgetInput('');
                }}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
            {budgetLimit !== null && (
              <button
                onClick={handleBudgetRemove}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove Budget Limit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      {showBreakdown && (
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-3">Cost by Scene</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {costBreakdown.map((item) => (
              <div
                key={item.sceneId}
                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Scene {item.sceneIndex + 1}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                        : item.status === 'processing'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
