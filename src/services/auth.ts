import { supabase } from '../lib/supabase';

export async function ensureUserProfile() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : null;

  await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName
  }, { onConflict: 'id' });

  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}
