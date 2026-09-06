// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';
import { getCurrentStreak } from './streak';

export type DashboardData = {
  userName: string;
  averageScore: number | null;
  totalQuestionsAnswered: number;
  mockExamCount: number;
  streak: number;
  examType: string | null;
  examGoals: string | null;
  isPro: boolean;
  recommendation: { subject: string; accuracy: number } | null;
  hasSessions: boolean;
  totalPoints: number;
  rank: string;
};

function formatExamGoals(value: unknown): string | null {
  const goals = (Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    .map(goal => String(goal).trim().toUpperCase())
    .filter(Boolean);
  if (goals.includes('BOTH')) return 'JAMB & WAEC Preparation';
  if (goals.includes('JAMB') && goals.includes('WAEC')) return 'JAMB & WAEC Preparation';
  if (goals.includes('JAMB') || goals.includes('WAEC')) return `${goals[0]} Preparation`;
  return null;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [sessionsResult, profileResult, pointsResult, streak] = await Promise.all([
    supabase.from('sessions').select('id,score,mode').eq('user_id', userId),
    supabase.from('users').select('full_name,email,exam_type,exam_goals,is_pro').eq('id', userId).maybeSingle(),
    supabase.from('user_points').select('total_points,rank').eq('user_id', userId).maybeSingle(),
    getCurrentStreak(userId)
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (profileResult.error) throw profileResult.error;
  if (pointsResult.error) throw pointsResult.error;

  const sessions = sessionsResult.data ?? [];
  const sessionIds = sessions.map(session => session.id);
  const [answerResult, recommendation] = await Promise.all([
    sessionIds.length ? supabase.from('answers').select('id', { count: 'exact', head: true }).in('session_id', sessionIds) : Promise.resolve({ count: 0, error: null }),
    getRecommendation(userId)
  ]);
  if (answerResult.error) throw answerResult.error;

  const completed = sessions.filter(session => session.score !== null);
  const averageScore = completed.length ? Math.round(completed.reduce((sum, session) => sum + (session.score ?? 0), 0) / completed.length) : null;
  const profile = profileResult.data;
  return {
    userName: profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Learner',
    averageScore,
    totalQuestionsAnswered: answerResult.count ?? 0,
    mockExamCount: sessions.filter(session => session.mode === 'mock').length,
    streak,
    examType: profile?.exam_type ?? null,
    examGoals: formatExamGoals(profile?.exam_goals),
    isPro: profile?.is_pro ?? false,
    recommendation,
    hasSessions: completed.length > 0,
    totalPoints: pointsResult.data?.total_points ?? 0,
    rank: pointsResult.data?.rank ?? 'Beginner'
  };
}

async function getRecommendation(userId: string): Promise<DashboardData['recommendation']> {
  const { data, error } = await supabase
    .from('answers')
    .select('id,is_correct,question:questions(subject:subjects(name)),session:sessions!inner(user_id)')
    .eq('session.user_id', userId);
  if (error) throw error;

  const stats = new Map<string, { correct: number; total: number }>();
  for (const answer of data ?? []) {
    const question = Array.isArray(answer.question) ? answer.question[0] : answer.question;
    const subject = Array.isArray(question?.subject) ? question.subject[0] : question?.subject;
    if (!subject?.name) continue;
    const value = stats.get(subject.name) ?? { correct: 0, total: 0 };
    value.total += 1;
    if (answer.is_correct) value.correct += 1;
    stats.set(subject.name, value);
  }
  const recommendations = [...stats.entries()]
    .filter(([, value]) => value.total >= 3)
    .map(([subject, value]) => ({ subject, accuracy: Math.round((value.correct / value.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
  return recommendations[0] ?? null;
}
