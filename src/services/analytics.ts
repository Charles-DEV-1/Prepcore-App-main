// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';

export type SubjectAccuracy = { name: string; accuracy: number };
export type ProgressAnalytics = { trend: { score: number; completedAt: string }[]; accuracy: SubjectAccuracy[]; overall: { correct: number; incorrect: number; total: number } };

export async function getProgressAnalytics(userId: string, examType: string): Promise<ProgressAnalytics> {
  const [{ data: sessions, error: sessionError }, { data: answers, error: answerError }] = await Promise.all([
    supabase.from('sessions').select('score,completed_at').eq('user_id', userId).eq('exam_type', examType.toLowerCase()).not('score', 'is', null).order('completed_at', { ascending: true }),
    supabase.from('answers').select('is_correct,question:questions(subject:subjects(name)),session:sessions!inner(user_id,exam_type)').eq('session.user_id', userId).eq('session.exam_type', examType.toLowerCase())
  ]);
  if (sessionError) throw sessionError;
  if (answerError) throw answerError;

  const stats = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  let total = 0;
  for (const answer of answers ?? []) {
    const question = Array.isArray(answer.question) ? answer.question[0] : answer.question;
    const subject = Array.isArray(question?.subject) ? question.subject[0] : question?.subject;
    if (!subject?.name) continue;
    const value = stats.get(subject.name) ?? { correct: 0, total: 0 };
    value.total += 1;
    total += 1;
    if (answer.is_correct) { value.correct += 1; correct += 1; }
    stats.set(subject.name, value);
  }
  return {
    trend: [...(sessions ?? [])].reverse().map(session => ({ score: session.score ?? 0, completedAt: session.completed_at })),
    accuracy: [...stats.entries()].map(([name, value]) => ({ name, accuracy: Math.round((value.correct / value.total) * 100) })).sort((a, b) => b.accuracy - a.accuracy),
    overall: { correct, incorrect: total - correct, total }
  };
}
