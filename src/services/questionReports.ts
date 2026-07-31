import { supabase } from '../lib/supabase';

export async function reportQuestion(
  userId: string,
  questionId: string,
  sessionId: string | null,
  reason: 'Wrong answer' | 'Confusing question' | 'Typo / error' | 'Bad explanation' | 'Other',
  details?: string
) {
  const { error } = await supabase.from('question_reports').insert({
    user_id: userId,
    question_id: questionId,
    session_id: sessionId,
    reason,
    details: details?.trim() ?? null,
    created_at: new Date().toISOString()
  });

  if (error) throw error;
}
