// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';

export async function getCurrentQuiz() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('weekly_quizzes')
    .select('id,week_start,week_end,question_ids')
    .eq('is_active', true)
    .lte('week_start', today)
    .gte('week_end', today)
    .maybeSingle();
  return data;
}

export async function checkAlreadyCompleted(quizId: string, userId: string) {
  const { data } = await supabase
    .from('weekly_quiz_entries')
    .select('score,total_questions,completed_at')
    .eq('quiz_id', quizId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function loadQuizQuestions(questionIds: string[]) {
  const { data } = await supabase
    .from('questions')
    .select('id,prompt,options,correct_answer,explanation,topic,year,subject:subjects(name)')
    .in('id', questionIds);

  if (!data) return [];

  return questionIds
    .map(id => data.find(question => question.id === id))
    .filter(Boolean)
    .map(question => {
      const subject = Array.isArray(question?.subject) ? question?.subject[0] : question?.subject;
      return { ...question, subject_name: subject?.name ?? 'General' };
    });
}

export async function submitQuiz(quizId: string, userId: string, questions: any[], answers: Record<string, string>) {
  const correct = questions.filter(question => answers[question.id] === question.correct_answer).length;

  await supabase.from('weekly_quiz_entries').insert({
    quiz_id: quizId,
    user_id: userId,
    score: correct,
    total_questions: questions.length,
    answers,
    completed_at: new Date().toISOString()
  });

  const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  await supabase.rpc('add_user_points', {
    p_user_id: userId,
    p_points: percent >= 70 ? 30 : 20,
    p_session_type: 'quiz'
  });

  return { score: correct, percent };
}

export type LeaderboardEntry = { user_id: string; user_name: string; rank_name: string; score: number; total_questions: number; percent: number; is_me: boolean; time_taken_seconds: number | null };

export async function getLeaderboard(quizId: string, currentUserId: string): Promise<LeaderboardEntry[]> {
  const { data: entries } = await supabase
    .from('weekly_quiz_entries')
    .select('user_id,score,total_questions,time_taken_seconds,completed_at')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true, nullsFirst: false })
    .limit(50);

  if (!entries?.length) return [];

  const userIds = entries.map(entry => entry.user_id);
  const [{ data: users }, { data: pointsData }] = await Promise.all([
    supabase.from('users').select('id,full_name,email').in('id', userIds),
    supabase.from('user_points').select('user_id,rank').in('user_id', userIds)
  ]);

  const userMap: Record<string, string> = {};
  (users ?? []).forEach(user => {
    userMap[user.id] = user.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Student';
  });

  const rankMap: Record<string, string> = {};
  (pointsData ?? []).forEach(points => {
    rankMap[points.user_id] = points.rank ?? 'Beginner';
  });

  return entries.map(entry => ({
    user_id: entry.user_id,
    user_name: userMap[entry.user_id] ?? 'Student',
    rank_name: rankMap[entry.user_id] ?? 'Beginner',
    score: entry.score,
    total_questions: entry.total_questions,
    percent: entry.total_questions ? Math.round((entry.score / entry.total_questions) * 100) : 0,
    is_me: entry.user_id === currentUserId,
    time_taken_seconds: entry.time_taken_seconds ?? null
  }));
}

export async function getAllTimeLeaderboard(currentUserId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.from('user_points').select('user_id,total_points,rank,user:users!inner(full_name,email)').order('total_points', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []).map(row => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return { user_id: row.user_id, user_name: user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Learner', rank_name: row.rank ?? 'Beginner', score: row.total_points ?? 0, total_questions: 0, percent: row.total_points ?? 0, is_me: row.user_id === currentUserId, time_taken_seconds: null };
  });
}
