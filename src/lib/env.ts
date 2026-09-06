import Constants from 'expo-constants';

const expoConfig = (Constants.expoConfig || {}) as Record<string, any>;
const extra = (expoConfig.extra || {}) as Record<string, any>;
const env = ((globalThis as any).process?.env ?? {}) as Record<string, any>;

export const SUPABASE_URL = String(extra.supabaseUrl ?? env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '');
export const SUPABASE_ANON_KEY = String(extra.supabaseAnonKey ?? env.SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '');
export const GOOGLE_CLIENT_ID = String(extra.googleClientId ?? env.GOOGLE_CLIENT_ID ?? env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '');
export const FLUTTERWAVE_PUBLIC_KEY = String(extra.flutterwavePublicKey ?? env.FLUTTERWAVE_PUBLIC_KEY ?? env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? '');
export const FLUTTERWAVE_SECRET_KEY = String(extra.flutterwaveSecretKey ?? env.FLUTTERWAVE_SECRET_KEY ?? env.EXPO_PUBLIC_FLUTTERWAVE_SECRET_KEY ?? '');

if (__DEV__) {
  console.log('[env] SUPABASE_URL:', SUPABASE_URL.substring(0, 20) + '...');
  console.log('[env] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  console.log('[env] Config sources - expoConfig.extra:', !!extra.supabaseUrl, 'env vars:', !!env.SUPABASE_URL);
}
