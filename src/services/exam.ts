// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadQuestions, Question } from './practice';
import { updateStreak } from './streak';
import { getSubjectsWithQuestionCounts } from './subjects';

export async function checkMockExamLimit(userId: string, isPro: boolean) {
  if (isPro) return { allowed: true, remaining: 999 };

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_usage')
    .select('mock_exams_taken')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const taken = data?.mock_exams_taken ?? 0;
  return { allowed: taken < 3, remaining: Math.max(0, 3 - taken) };
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function loadFreshQuestions(subjectId: string, examType: string, count: number, userId?: string) {
  const pool = await loadQuestions(subjectId, count, examType);
  if (!userId) return shuffle(pool).slice(0, count);

  const historyKey = `exam_seen_${userId}_${examType.toLowerCase()}_${subjectId}`;
  let seen: string[] = [];
  try {
    const stored = await AsyncStorage.getItem(historyKey);
    seen = stored ? JSON.parse(stored) : [];
  } catch {
    seen = [];
  }
  const seenSet = new Set(seen);
  const fresh = shuffle(pool.filter(question => !seenSet.has(question.id))).slice(0, count);
  const remaining = count - fresh.length;
  const fallback = remaining > 0 ? shuffle(pool.filter(question => seenSet.has(question.id))).slice(0, remaining) : [];
  const selected = [...fresh, ...fallback];
  const nextHistory = [...seen, ...selected.map(question => question.id)].filter((id, index, ids) => ids.indexOf(id) === index).slice(-Math.max(pool.length, count));
  await AsyncStorage.setItem(historyKey, JSON.stringify(nextHistory));
  return selected;
}

export async function loadExamQuestions(examType = 'JAMB', subjectIds?: string[], userId?: string) {
  const subjects = await getSubjectsWithQuestionCounts(examType);
  const chosenSubjects = subjectIds?.length ? subjects.filter(subject => subjectIds.includes(subject.id)) : subjects.slice(0, 4);
  const englishSubject = chosenSubjects.find(subject => subject.label.toLowerCase().includes('english'));
  const otherSubjects = chosenSubjects.filter(subject => subject.id !== englishSubject?.id);
  const otherBase = otherSubjects.length ? Math.floor(120 / otherSubjects.length) : 0;
  const otherRemainder = otherSubjects.length ? 120 % otherSubjects.length : 0;
  const groups = await Promise.all(
    chosenSubjects.filter(subject => subject.questionCount > 0).slice(0, 4).map(async subject => {
      const otherIndex = otherSubjects.findIndex(item => item.id === subject.id);
      const requestedCount = englishSubject?.id === subject.id ? 60 : otherBase + (otherIndex >= 0 && otherIndex < otherRemainder ? 1 : 0);
      const questions = await loadFreshQuestions(subject.id, examType, requestedCount, userId);
      return questions.map(question => ({ ...question, subject_label: subject.label }));
    })
  );

  return groups.flat().sort(() => Math.random() - 0.5);
}

export async function submitExam(userId: string, questions: Question[], answers: Record<string, string>, examType = 'JAMB') {
  const correct = questions.filter(question => answers[question.id] === question.correct_answer).length;
  const scorePercent = questions.length ? Math.round((correct / questions.length) * 100) : 0;

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      mode: 'mock',
      score: scorePercent,
      total_questions: questions.length,
      exam_type: examType,
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error || !session) throw error ?? new Error('Unable to save exam session');

  await supabase.from('answers').insert(
    questions.map(question => ({
      session_id: session.id,
      question_id: question.id,
      selected_answer: answers[question.id] ?? null,
      is_correct: answers[question.id] === question.correct_answer,
      exam_type: question.exam_type ?? examType
    }))
  );

  await supabase.rpc('increment_mock_exam_usage', {
    p_user_id: userId,
    p_date: new Date().toISOString().split('T')[0]
  });
  await updateStreak(userId);
  await supabase.rpc('add_user_points', {
    p_user_id: userId,
    p_points: scorePercent >= 90 ? 45 : scorePercent >= 70 ? 35 : 25,
    p_session_type: 'mock'
  });

  return { sessionId: session.id, score: scorePercent, correct };
}
