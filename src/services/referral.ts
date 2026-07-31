import { supabase } from '../lib/supabase';

export async function getOrCreateReferralCode(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('referral_code, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  let referralCode = data?.referral_code;
  if (!referralCode) {
    const slug = (data?.full_name ?? 'PREPCORE')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    referralCode = `${slug}${userId.replace(/[^A-Z0-9]/gi, '').slice(0, 6)}`.slice(0, 12);

    const { error: updateError } = await supabase
      .from('users')
      .update({ referral_code: referralCode })
      .eq('id', userId);

    if (updateError) throw updateError;
  }

  return referralCode;
}
