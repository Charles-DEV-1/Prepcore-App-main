type StreakEvent = { userId: string; streak: number; emittedAt: number };
type StreakListener = (event: StreakEvent) => void;

const listeners = new Set<StreakListener>();
let latestEvent: StreakEvent | null = null;

export function subscribeToStreak(listener: StreakListener) {
  listeners.add(listener);
  // Navigation/auth rerenders can briefly happen while a session is being
  // saved. Replay only a very recent event so the celebration is not missed,
  // without replaying old streaks every time a screen mounts.
  if (latestEvent && Date.now() - latestEvent.emittedAt < 5000) listener(latestEvent);
  return () => listeners.delete(listener);
}

export function emitStreakIncreased(userId: string, streak: number) {
  latestEvent = { userId, streak, emittedAt: Date.now() };
  listeners.forEach(listener => listener(latestEvent!));
}
