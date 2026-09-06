import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const FLASHCARD_CACHE_KEY_PREFIX = 'prepcore_flashcards';
const FLASHCARD_PROGRESS_CACHE_KEY = 'prepcore_flashcard_progress';

export type FlashcardRecord = {
  id: string;
  subject_id: string;
  front: string;
  back: string;
  is_premium?: boolean | null;
};

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore cache write failures
  }
}

export async function loadFlashcards(subjectId: string) {
  const cacheKey = `${FLASHCARD_CACHE_KEY_PREFIX}:${subjectId}`;

  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('id,subject_id,front,back,is_premium')
      .eq('subject_id', subjectId)
      .order('created_at');

    if (error) throw error;
    const cards = (data ?? []) as FlashcardRecord[];
    await writeCache<FlashcardRecord[]>(cacheKey, cards);
    return cards;
  } catch {
    return ((await readCache<FlashcardRecord[]>(cacheKey)) ?? []) as FlashcardRecord[];
  }
}

export async function saveFlashcardProgress(userId: string, flashcardId: string, status: 'got_it' | 'review' | 'bookmark' | 'difficult') {
  try {
    await supabase.from('flashcard_progress').upsert({
      user_id: userId,
      flashcard_id: flashcardId,
      status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,flashcard_id' });
  } catch {
    // continue with local tracking
  }

  const progress = await readCache<Record<string, string>>(FLASHCARD_PROGRESS_CACHE_KEY) ?? {};
  progress[flashcardId] = status;
  await writeCache<Record<string, string>>(FLASHCARD_PROGRESS_CACHE_KEY, progress);
}

export async function getFlashcardProgressStats() {
  const progress = await readCache<Record<string, string>>(FLASHCARD_PROGRESS_CACHE_KEY) ?? {};
  const known = Object.values(progress).filter(status => status === 'got_it').length;
  const review = Object.values(progress).filter(status => status === 'review').length;
  const bookmarked = Object.values(progress).filter(status => status === 'bookmark').length;
  return { known, review, bookmarked, total: Object.keys(progress).length };
}
