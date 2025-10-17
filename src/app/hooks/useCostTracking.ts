import { useMemo } from 'react';
import { Scene } from '@/lib/types';
import { useSafeLocalStorage } from './useSafeLocalStorage';

/**
 * Cost estimates for video generation
 * Based on Sora 2 and Veo 3.1 pricing
 */
const COST_PER_SECOND = {
  'sora': 0.50,      // $0.50 per second for Sora 2
  'sora-pro': 0.75,  // $0.75 per second for Sora 2 Pro
  'veo': 0.30,       // $0.30 per second for Veo 3.1
};

interface CostTrackingData {
  totalSpent: number;
  budgetLimit: number | null;
  sceneCosts: Record<string, number>;
}

interface CostBreakdown {
  sceneId: string;
  sceneIndex: number;
  cost: number;
  status: 'completed' | 'pending' | 'processing';
}

interface UseCostTrackingReturn {
  totalSpent: number;
  budgetLimit: number | null;
  setBudgetLimit: (limit: number | null) => void;
  estimatedTotal: number;
  remainingBudget: number | null;
  isOverBudget: boolean;
  isNearBudget: boolean; // Within 80% of budget
  costBreakdown: CostBreakdown[];
  pendingCost: number;
  completedCost: number;
  updateSceneCost: (sceneId: string, cost: number) => void;
  resetCosts: () => void;
}

/**
 * Hook for tracking video generation costs and budget management
 * Persists data to localStorage
 */
export function useCostTracking(
  storyboardId: string,
  scenes: Scene[]
): UseCostTrackingReturn {
  const [costData, setCostData] = useSafeLocalStorage<CostTrackingData>(
    `cost-tracking-${storyboardId}`,
    {
      totalSpent: 0,
      budgetLimit: null,
      sceneCosts: {},
    },
    {
      debounceMs: 300,
    }
  );

  /**
   * Calculate estimated cost for a scene based on provider and duration
   */
  const estimateSceneCost = (scene: Scene): number => {
    const provider = scene.videoJob?.provider || 'sora';
    const duration = scene.duration;

    // Use appropriate rate based on provider
    const rate = provider === 'veo' ? COST_PER_SECOND.veo : COST_PER_SECOND.sora;
    return duration * rate;
  };

  /**
   * Calculate total spent on completed videos
   */
  const completedCost = useMemo(() => {
    return scenes.reduce((sum, scene) => {
      if (scene.videoJob?.status === 'completed') {
        // Use actual cost if available, otherwise use stored cost
        const cost = scene.videoJob.cost || costData.sceneCosts[scene.id] || 0;
        return sum + cost;
      }
      return sum;
    }, 0);
  }, [scenes, costData.sceneCosts]);

  /**
   * Calculate estimated cost for pending scenes
   */
  const pendingCost = useMemo(() => {
    return scenes.reduce((sum, scene) => {
      if (!scene.videoJob || scene.videoJob.status === 'pending') {
        return sum + estimateSceneCost(scene);
      }
      return sum;
    }, 0);
  }, [scenes]);

  /**
   * Calculate total estimated cost (completed + pending)
   */
  const estimatedTotal = useMemo(() => {
    return completedCost + pendingCost;
  }, [completedCost, pendingCost]);

  /**
   * Calculate remaining budget
   */
  const remainingBudget = useMemo(() => {
    if (costData.budgetLimit === null) return null;
    return Math.max(0, costData.budgetLimit - completedCost);
  }, [costData.budgetLimit, completedCost]);

  /**
   * Check if over budget
   */
  const isOverBudget = useMemo(() => {
    if (costData.budgetLimit === null) return false;
    return completedCost > costData.budgetLimit;
  }, [costData.budgetLimit, completedCost]);

  /**
   * Check if near budget (within 80%)
   */
  const isNearBudget = useMemo(() => {
    if (costData.budgetLimit === null) return false;
    return completedCost >= costData.budgetLimit * 0.8 && !isOverBudget;
  }, [costData.budgetLimit, completedCost, isOverBudget]);

  /**
   * Get cost breakdown by scene
   */
  const costBreakdown = useMemo((): CostBreakdown[] => {
    return scenes.map((scene, index) => {
      let cost = 0;
      let status: 'completed' | 'pending' | 'processing' = 'pending';

      if (scene.videoJob?.status === 'completed') {
        cost = scene.videoJob.cost || costData.sceneCosts[scene.id] || estimateSceneCost(scene);
        status = 'completed';
      } else if (scene.videoJob?.status === 'processing') {
        cost = estimateSceneCost(scene);
        status = 'processing';
      } else {
        cost = estimateSceneCost(scene);
      }

      return {
        sceneId: scene.id,
        sceneIndex: index,
        cost,
        status,
      };
    });
  }, [scenes, costData.sceneCosts]);

  /**
   * Set budget limit
   */
  const setBudgetLimit = (limit: number | null) => {
    setCostData(prev => ({ ...prev, budgetLimit: limit }));
  };

  /**
   * Update cost for a specific scene (when video completes)
   */
  const updateSceneCost = (sceneId: string, cost: number) => {
    setCostData(prev => ({
      ...prev,
      sceneCosts: {
        ...prev.sceneCosts,
        [sceneId]: cost,
      },
      totalSpent: prev.totalSpent + cost,
    }));
  };

  /**
   * Reset all cost tracking data
   */
  const resetCosts = () => {
    setCostData({
      totalSpent: 0,
      budgetLimit: costData.budgetLimit, // Keep budget limit
      sceneCosts: {},
    });
  };

  return {
    totalSpent: completedCost,
    budgetLimit: costData.budgetLimit,
    setBudgetLimit,
    estimatedTotal,
    remainingBudget,
    isOverBudget,
    isNearBudget,
    costBreakdown,
    pendingCost,
    completedCost,
    updateSceneCost,
    resetCosts,
  };
}
