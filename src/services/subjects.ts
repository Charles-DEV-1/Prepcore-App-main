// Prepcore — Live Data & Polish
import { supabase } from '../lib/supabase';
import type { Question } from './practice';

export type LiveSubject = { id: string; label: string; examType: string; questionCount: number };

export async function getSubjectsWithQuestionCounts(examType: string): Promise<LiveSubject[]> {
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('id,name,exam_type')
    .eq('exam_type', examType.toLowerCase())
    .order('name', { ascending: true });
  if (error) throw error;

  const ids = (subjects ?? []).map(subject => subject.id);
  if (!ids.length) return [];
  const { data: questions, error: questionError } = await supabase
    .from('questions')
    .select('subject_id')
    .in('subject_id', ids)
    .eq('exam_type', examType.toLowerCase());
  if (questionError) throw questionError;

  const counts = (questions ?? []).reduce<Record<string, number>>((result, question) => {
    result[question.subject_id] = (result[question.subject_id] ?? 0) + 1;
    return result;
  }, {});
  return (subjects ?? []).map(subject => ({ id: subject.id, label: subject.name, examType: subject.exam_type, questionCount: counts[subject.id] ?? 0 }));
}

export async function getRandomQuestionsBySubject(subjectId: string, count = 25): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id,prompt,options,correct_answer,explanation,topic,year,subject_id,exam_type')
    .eq('subject_id', subjectId)
    .order('year', { ascending: false });
  if (error) throw error;
  return [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, count) as Question[];
}

export async function getSubjectById(subjectId: string): Promise<LiveSubject | null> {
  const { data, error } = await supabase.from('subjects').select('id,name,exam_type').eq('id', subjectId).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, label: data.name, examType: data.exam_type, questionCount: 0 } : null;
}
