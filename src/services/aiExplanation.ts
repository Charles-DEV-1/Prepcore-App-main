import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const AI_USAGE_PREFIX = 'ai_usage_';
const FREE_LIMIT = 5;
const PRO_LIMIT = 10;

function usageKey() {
  return AI_USAGE_PREFIX + new Date().toISOString().split('T')[0];
}

export async function getTodayUsage() {
  const stored = await AsyncStorage.getItem(usageKey());
  return Number.parseInt(stored ?? '0', 10) || 0;
}

export async function getAIExplanation(params: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  subject: string;
  isPro: boolean;
}) {
  const limit = params.isPro ? PRO_LIMIT : FREE_LIMIT;
  const used = await getTodayUsage();

  if (used >= limit) {
    throw new Error(params.isPro ? 'Daily AI limit reached (10/day on Pro).' : 'Daily AI limit reached. Upgrade to Pro for more.');
  }

  const { data, error } = await supabase.functions.invoke('ai-explanation', { body: params });
  if (error) {
    let message = error.message || 'AI explanation service is unavailable.';
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json();
        if (payload?.error) message = String(payload.error);
      } catch {
        // Keep the SDK error when the function did not return JSON.
      }
    }
    throw new Error(message);
  }
  if (!data?.explanation) throw new Error(data?.error || 'AI did not return an explanation.');
  await AsyncStorage.setItem(usageKey(), String(used + 1));
  return data.explanation;
}
