// Prepcore - UI Polish
import { supabase } from '../lib/supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('full_name,email,phone,exam_type,exam_goals,target_score,exam_date,selected_subjects')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  phone?: string;
  exam_type?: string;
  exam_goals?: string;
  target_score?: number;
  exam_date?: string;
}) {
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw error;
}

export async function getUserPoints(userId: string) {
  const { data } = await supabase
    .from('user_points')
    .select('total_points,rank,sessions_completed,quizzes_completed')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    totalPoints: data?.total_points ?? 0,
    rank: data?.rank ?? 'Beginner',
    sessionsCompleted: data?.sessions_completed ?? 0,
    quizzesCompleted: data?.quizzes_completed ?? 0
  };
}
