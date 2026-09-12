import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_ONBOARDING_KEY = 'prepcore_pending_onboarding';

export type OnboardingValues = {
  fullName?: string;
  examType: 'JAMB' | 'WAEC' | 'NECO';
  examGoals?: string[];
  subjects: string[];
  targetScore: number;
  examDate: string;
  referralCode?: string;
};

export async function savePendingOnboarding(values: OnboardingValues) {
  await AsyncStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(values));
}

export async function clearPendingOnboarding() {
  await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY);
}

export async function completePendingOnboarding() {
  const raw = await AsyncStorage.getItem(PENDING_ONBOARDING_KEY);
  if (!raw) return false;

  try {
    const values = JSON.parse(raw) as OnboardingValues;
    await completeOnboarding(values);
    await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY);
    return true;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unable to save your onboarding plan.');
  }
}

export async function completeOnboarding(values: OnboardingValues) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const examType = values.examType.toLowerCase();
  const examGoals = (values.examGoals ?? [values.examType]).map(goal => goal.toLowerCase());
  const { error } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: values.fullName?.trim() || user.user_metadata?.full_name || null,
    exam_type: examType,
    exam_goals: examGoals,
    selected_subjects: values.subjects,
    target_score: values.targetScore,
    exam_date: values.examDate,
    onboarding_completed: true
  });

  if (error) throw error;

  if (values.referralCode?.trim()) {
    const { error: referralError } = await supabase.rpc('apply_any_referral_code', {
      p_code: values.referralCode.trim().toUpperCase()
    });
    if (referralError) throw referralError;
  }
}
