import { supabase } from '../lib/supabase';

export async function getCurrentStreak(userId: string) {
  const { data } = await supabase
    .from('streaks')
    .select('current_count')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.current_count ?? 0;
}

export async function updateStreak(userId: string) {
  const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateKey(yesterday);

  const { data: streak } = await supabase
    .from('streaks')
    .select('id,current_count,longest_count,last_activity_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (!streak) {
    await supabase.from('streaks').insert({
      user_id: userId,
      current_count: 1,
      longest_count: 1,
      last_activity_date: today
    });
    return;
  }

  if (streak.last_activity_date === today) return;

  const newCount = streak.last_activity_date === yesterdayStr ? (streak.current_count ?? 0) + 1 : 1;

  await supabase
    .from('streaks')
    .update({
      current_count: newCount,
      longest_count: Math.max(newCount, streak.longest_count ?? 0),
      last_activity_date: today
    })
    .eq('id', streak.id);

  await supabase.rpc('add_user_points', {
    p_user_id: userId,
    p_points: 5,
    p_session_type: 'streak'
  });
}
