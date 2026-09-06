import { supabase } from '../lib/supabase';
import { emitStreakIncreased } from './streakEvents';

export async function getCurrentStreak(userId: string) {
  const { data, error } = await supabase.rpc('get_current_streak', { p_user_id: userId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function updateStreak(userId: string) {
  const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateKey(new Date());
  const { data, error } = await supabase.rpc('record_study_streak', {
    p_user_id: userId,
    p_activity_date: today,
  });
  if (error) throw error;
  const result = (data ?? {}) as { current_count?: number; increased?: boolean };
  const newCount = Number(result.current_count ?? 0);
  if (!result.increased) return newCount;
  emitStreakIncreased(userId, newCount);

  try {
    await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_points: 5,
      p_session_type: 'streak'
    });
  } catch {
    // A points failure must not roll back or hide a successful streak update.
  }
  return newCount;
}
