import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToStreak } from '../services/streakEvents';
import { StreakCelebration } from './StreakCelebration';

export function StreakCelebrationHost() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);
  const dismiss = useCallback(() => setStreak(null), []);

  useEffect(() => {
    const unsubscribe = subscribeToStreak(event => {
      if (user?.id === event.userId) setStreak(event.streak);
    });
    return () => { unsubscribe(); };
  }, [user?.id]);

  return <StreakCelebration streak={streak ?? 0} visible={streak !== null} onComplete={dismiss} />;
}
