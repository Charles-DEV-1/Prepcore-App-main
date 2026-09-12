import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

console.log('[supabase] Initializing with URL:', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const error = `Supabase configuration is missing. SUPABASE_URL: ${!!SUPABASE_URL}, SUPABASE_ANON_KEY: ${!!SUPABASE_ANON_KEY}`;
  console.error('[supabase]', error);
  throw new Error(error);
}

console.log('[supabase] Config valid, creating client...');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit'
  }
});

console.log('[supabase] Client created successfully');
