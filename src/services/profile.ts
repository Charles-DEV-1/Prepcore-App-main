// Prepcore - UI Polish
import { supabase } from '../lib/supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id,full_name,email,phone,exam_type,exam_goals,target_score,exam_date,selected_subjects')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  email?: string;
  phone?: string;
  exam_type?: string;
  exam_goals?: string[];
  target_score?: number;
  exam_date?: string;
}) {
  const { data: existing, error: lookupError } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user || authData.user.id !== userId) throw new Error('Your session has expired. Please sign in again.');
    const { error: createError } = await supabase.from('users').upsert({
      id: userId,
      email: authData.user.email ?? null,
      full_name: authData.user.user_metadata?.full_name ?? null,
    }, { onConflict: 'id' });
    if (createError) throw createError;
  }
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Your profile could not be updated. Check that you are signed in and try again.');
}

export async function updateAccount(userId: string, updates: { full_name: string; phone: string; email: string; currentEmail: string }) {
  const nextEmail = updates.email.trim().toLowerCase();
  if (nextEmail && nextEmail !== updates.currentEmail.trim().toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    if (error) throw error;
  }
  await updateProfile(userId, { full_name: updates.full_name.trim(), phone: updates.phone.trim(), email: nextEmail });
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
