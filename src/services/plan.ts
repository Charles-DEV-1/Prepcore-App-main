import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'pro';
export type PlanSource = 'free' | 'individual' | 'partner_bulk';

export type EffectivePlan = {
  plan: Plan;
  source: PlanSource;
  partnerName?: string;
};

function isIndividualPro(sub: { plan: string; status: string; current_period_end: string | null }) {
  return (
    sub.plan === 'pro' &&
    sub.status === 'active' &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
  );
}

function isPartnerBulkProActive(partner: { bulk_pro_active: boolean; bulk_pro_expires_at: string | null }) {
  if (!partner.bulk_pro_active) return false;
  if (!partner.bulk_pro_expires_at) return true;
  return new Date(partner.bulk_pro_expires_at) > new Date();
}

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub && isIndividualPro(sub)) {
    return { plan: 'pro', source: 'individual' };
  }

  const { data: referralRow } = await supabase
    .from('user_referrals')
    .select('partner_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!referralRow?.partner_id) {
    return { plan: 'free', source: 'free' };
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('name,bulk_pro_active,bulk_pro_expires_at,is_active')
    .eq('id', referralRow.partner_id)
    .maybeSingle();

  if (partner?.is_active && isPartnerBulkProActive(partner)) {
    return { plan: 'pro', source: 'partner_bulk', partnerName: partner.name };
  }

  return { plan: 'free', source: 'free', partnerName: partner?.name };
}

export async function subscribeUserToPro(userId: string) {
  const now = new Date().toISOString();
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan: 'pro',
        status: 'active',
        current_period_end: nextYear,
        updated_at: now
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
  return nextYear;
}
