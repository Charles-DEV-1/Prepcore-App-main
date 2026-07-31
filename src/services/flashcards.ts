import { supabase } from '../lib/supabase';

export async function loadFlashcards(subjectId: string) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('id,front,back,is_premium')
    .eq('subject_id', subjectId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function saveFlashcardProgress(userId: string, flashcardId: string, status: 'got_it' | 'review') {
  await supabase.from('flashcard_progress').upsert({
    user_id: userId,
    flashcard_id: flashcardId,
    status,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,flashcard_id' });
}
