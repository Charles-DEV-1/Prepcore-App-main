import { supabase } from '../lib/supabase';

export type OnboardingValues = {
  examType: 'JAMB' | 'WAEC' | 'NECO';
  subjects: string[];
  targetScore: number;
  examDate: string;
  referralCode?: string;
};

export async function completeOnboarding(values: OnboardingValues) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
    exam_type: values.examType,
    selected_subjects: values.subjects,
    subjects: values.subjects,
    target_score: values.targetScore,
    exam_date: values.examDate,
    onboarding_completed: true
  });

  if (error) throw error;

  if (values.referralCode?.trim()) {
    await supabase.rpc('apply_referral_code', {
      code: values.referralCode.trim().toUpperCase()
    });
  }
}
