// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';
import { updateStreak } from './streak';

export type Question = {
  id: string;
  prompt: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
  year: number | null;
  subject_id?: string;
  subject_label?: string;
  exam_type?: string;
};

export async function loadQuestions(subjectId: string, count = 25): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id,prompt,options,correct_answer,explanation,topic,year,subject_id,exam_type')
    .eq('subject_id', subjectId)
    .order('year', { ascending: false });

  if (error) throw error;

  return [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, count) as Question[];
}

export async function savePracticeSession(
  userId: string,
  questions: Question[],
  answers: Record<string, string>
) {
  const correct = questions.filter(question => answers[question.id] === question.correct_answer).length;
  const scorePercent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const examType = questions[0]?.exam_type ?? null;

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      mode: 'practice',
      score: scorePercent,
      total_questions: questions.length,
      exam_type: examType,
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error || !session) throw error ?? new Error('Unable to save practice session');

  const answerRows = questions.map(question => ({
    session_id: session.id,
    question_id: question.id,
      selected_answer: answers[question.id] ?? null,
      is_correct: answers[question.id] === question.correct_answer,
      exam_type: question.exam_type ?? examType
  }));

  await supabase.from('answers').insert(answerRows);
  await updateStreak(userId);
  await supabase.rpc('add_user_points', {
    p_user_id: userId,
    p_points: scorePercent >= 90 ? 30 : scorePercent >= 70 ? 20 : 10,
    p_session_type: 'practice'
  });

  return { sessionId: session.id, score: scorePercent, correct };
}
