import { supabase } from '../lib/supabase';

export async function reportQuestion(
  userId: string,
  questionId: string,
  sessionId: string | null,
  reason: 'Wrong answer' | 'Confusing question' | 'Typo / error' | 'Bad explanation' | 'Other',
  details?: string
) {
  if (!userId) throw new Error('Please sign in before sending a report.');
  if (!questionId) throw new Error('This question could not be identified. Please reopen it and try again.');

  const report: Record<string, unknown> = {
    user_id: userId,
    question_id: questionId,
    reason,
  };

  // Keep the base insert compatible with older question_reports tables. These
  // optional columns are added only when the caller actually has a value.
  if (sessionId) report.session_id = sessionId;
  if (details?.trim()) report.details = details.trim();

  // Do not request a returned row: some existing RLS policies allow INSERT
  // but do not allow SELECT, even for the same user's newly-created report.
  const { error } = await supabase.from('question_reports').insert(report);

  if (error) {
    if (error.code === '42P01') throw new Error('Question reports are not enabled yet. Run the question_reports migration in Supabase.');
    if (error.code === '42501') throw new Error('You are not allowed to submit this report. Please sign in again.');
    throw new Error(error.message || 'Unable to save this report.');
  }
}
