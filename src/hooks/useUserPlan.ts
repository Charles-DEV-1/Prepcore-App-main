import { useEffect, useState } from 'react';
import { getEffectivePlan, type EffectivePlan } from '../services/plan';

export function useUserPlan(userId?: string) {
  const [result, setResult] = useState<EffectivePlan>({ plan: 'free', source: 'free' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      if (!userId) {
        setResult({ plan: 'free', source: 'free' });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const plan = await getEffectivePlan(userId);
        if (mounted) setResult(plan);
      } catch {
        if (mounted) setResult({ plan: 'free', source: 'free' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadPlan();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return {
    ...result,
    isPro: result.plan === 'pro',
    isFree: result.plan === 'free',
    isLoading
  };
}
