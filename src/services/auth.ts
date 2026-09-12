import { supabase } from '../lib/supabase';

export const AUTH_REDIRECT_URL = 'prepcore://auth/callback';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendSignInMagicLink(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');

  if (__DEV__) console.log('[AUTH] sign-in magic link started', { email: normalizedEmail });
  const { data, error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false, emailRedirectTo: AUTH_REDIRECT_URL }
  });
  if (error) throw error;
  if (__DEV__) console.log('[AUTH] magic-link request result', { hasUser: Boolean(data.user), hasSession: Boolean(data.session), redirect: AUTH_REDIRECT_URL });
}

export async function sendSignupMagicLink(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');

  const { data, error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: AUTH_REDIRECT_URL
    }
  });
  if (error) throw error;
  return {
    email: normalizedEmail,
    hasSession: Boolean(data.session)
  };
}

export function formatAuthError(error: unknown) {
  if (!error || typeof error !== 'object') return 'Authentication failed. Please try again.';
  const authError = error as { message?: string; code?: string; status?: number };
  const details = [authError.code, authError.status ? `status ${authError.status}` : null].filter(Boolean).join(', ');
  return `${authError.message ?? 'Authentication failed. Please try again.'}${details ? ` (${details})` : ''}`;
}

export async function ensureUserProfile() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : null;

  const { error: profileError } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName
  }, { onConflict: 'id' });

  if (profileError) throw profileError;

  return user;
}

export async function getOnboardingStatus() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) throw authError ?? new Error('Your session could not be verified.');

  const { data, error } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.onboarding_completed === true;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
