import { supabase } from '../lib/supabase';

export async function getResults(sessionId: string) {
  const [sessionResult, answersResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('score,total_questions,mode,created_at')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('answers')
      .select('id,selected_answer,is_correct,question:questions(id,prompt,options,correct_answer,explanation,topic,year,subject:subjects(name))')
      .eq('session_id', sessionId)
  ]);

  const session = sessionResult.data;
  const answers = answersResult.data ?? [];
  const stats: Record<string, { correct: number; total: number }> = {};

  answers.forEach(answer => {
    const question = Array.isArray(answer.question) ? answer.question[0] : answer.question;
    const subject = Array.isArray(question?.subject) ? question?.subject[0] : question?.subject;
    const name = subject?.name ?? 'Unknown';
    if (!stats[name]) stats[name] = { correct: 0, total: 0 };
    stats[name].total += 1;
    if (answer.is_correct) stats[name].correct += 1;
  });

  const subjectStats = Object.entries(stats).map(([label, stat]) => ({
    label,
    correct: stat.correct,
    total: stat.total,
    percent: Math.round((stat.correct / stat.total) * 100)
  }));

  return {
    score: session?.score ?? 0,
    totalQuestions: session?.total_questions ?? 0,
    answers,
    subjectStats,
    wrongAnswers: answers.filter(answer => !answer.is_correct),
    correctCount: answers.filter(answer => answer.is_correct).length
  };
}
