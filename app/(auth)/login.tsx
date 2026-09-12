import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, TextInput } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureUserProfile, getOnboardingStatus, sendSignInMagicLink, AUTH_REDIRECT_URL } from '../../src/services/auth';
import { clearPendingOnboarding } from '../../src/services/onboarding';
import { ActionButton, BrandMark } from '../../src/components/PrepcoreUI';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AUTH_REDIRECT_URL;
const REFERRAL_STORAGE_KEY = 'prepcore_referral_code';
const NEXT_STORAGE_KEY = 'prepcore_next_path';

function getParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);

  if (parsedUrl.hash) {
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function resumeExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session) return;

      try {
        const isOnboarded = await getOnboardingStatus();
        router.replace(isOnboarded ? '/(tabs)/dashboard' : '/(auth)/onboarding');
      } catch {
        // Keep the login form visible if a persisted session cannot be verified.
      }
    }

    void resumeExistingSession();
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    async function captureReferralAndNext() {
      try {
        const url = await Linking.getInitialURL();
        if (!url) return;

        const params = getParamsFromUrl(url);
        const ref = params.get('ref') || params.get('referral');
        const next = params.get('next');

        if (ref) await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
        if (next) await AsyncStorage.setItem(NEXT_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }

    captureReferralAndNext();
  }, []);

  async function routeAfterAuth() {
    const nextPath = await AsyncStorage.getItem(NEXT_STORAGE_KEY);
    if (nextPath && nextPath.startsWith('/')) {
      await AsyncStorage.removeItem(NEXT_STORAGE_KEY);
      router.replace(nextPath);
      return;
    }
    const isOnboarded = await getOnboardingStatus();
    router.replace(isOnboarded ? '/(tabs)/dashboard' : '/(auth)/onboarding');
  }

  async function handleGoogleSignIn() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      await clearPendingOnboarding();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });

      if (error) {
        setError('OAuth error: ' + error.message);
        return;
      }
      if (!data.url) {
        setError('Google sign-in could not be started. Please check your internet connection.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        setError('Sign-in cancelled.');
        return;
      }

      const params = getParamsFromUrl(result.url);
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorCode || errorDescription) {
        setError(errorDescription || errorCode || 'Google sign-in failed.');
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const code = params.get('code');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) {
          setError('Session error: ' + sessionError.message);
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('Authentication error: ' + exchangeError.message);
          return;
        }
      } else {
        setError('Google did not return a session. Make sure your Supabase OAuth redirect URL is configured correctly.');
        return;
      }

      await ensureUserProfile();
      await routeAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSignIn() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      await clearPendingOnboarding();
      await sendSignInMagicLink(email);
      setMagicLinkSent(true);
      setStatus('Check your email for a secure sign-in link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send sign-in link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6">
      <View className="absolute left-0 right-0 top-0 h-72" style={{ backgroundColor: colors.primarySoft }} />
      <View className="flex-1 justify-center">
        <View className="items-center">
          <BrandMark size={86} />
          <Text className="mt-8 text-center text-4xl font-extrabold" style={{ color: colors.ink }}>{showSignIn ? 'Welcome back' : 'Your prep, personalized'}</Text>
          <Text className="mt-3 max-w-sm text-center text-base" style={{ color: colors.textSecondary }}>{showSignIn ? 'Sign in to continue your preparation.' : 'Build a focused study plan for your JAMB subjects.'}</Text>
        </View>

        {!showSignIn ? <View className="mt-12"><ActionButton onPress={() => router.push('/(auth)/onboarding')}>Get Started</ActionButton><Text className="mt-4 text-center text-sm" style={{ color: colors.textSecondary }}>Choose your subjects first, then save your plan.</Text></View> : <>
        <TextInput
          value={email}
          onChangeText={value => { setEmail(value); setMagicLinkSent(false); }}
          placeholder="Email address"
          placeholderTextColor="#A3AAB5"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-10 bg-white px-5 text-lg"
          style={{ minHeight: 58, borderRadius: radii.md, color: colors.text, ...shadow }}
        />

        <ActionButton
          className="mt-7"
          onPress={handleMagicLinkSignIn}
          disabled={loading || !email.trim()}
        >
          {loading ? 'Please wait...' : 'Send sign-in link'}
        </ActionButton>

        {magicLinkSent ? <Pressable className="mt-5 items-center" onPress={handleMagicLinkSignIn} disabled={loading}><Text className="text-base font-bold" style={{ color: colors.primary }}>Resend sign-in link</Text></Pressable> : null}

        <View className="my-8 flex-row items-center">
          <View className="h-px flex-1" style={{ backgroundColor: colors.line }} />
          <Text className="mx-5 text-lg" style={{ color: colors.text }}>or</Text>
          <View className="h-px flex-1" style={{ backgroundColor: colors.line }} />
        </View>

        <Pressable
          onPress={handleGoogleSignIn}
          className="flex-row items-center justify-center bg-white px-3"
          style={{ minHeight: 58, borderRadius: radii.md, borderWidth: 1, borderColor: colors.softLine, ...shadow }}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.primary} /> : <AntDesign name="google" size={24} color="#EA4335" />}
          <Text className="ml-4 text-xl font-semibold" style={{ color: colors.text }}>Continue with Google</Text>
        </Pressable>

        {status ? <Text className="mt-5 text-center text-sm" style={{ color: colors.success }}>{status}</Text> : null}
        {error ? <Text className="mt-5 text-center text-sm" style={{ color: colors.danger }}>{error}</Text> : null}

        </>}
        <Pressable className="mt-10 items-center" onPress={() => { setShowSignIn(value => !value); setError(null); setStatus(null); setMagicLinkSent(false); }}>
          <Text className="text-center text-base font-bold" style={{ color: colors.primary }}>{showSignIn ? 'Back to Get Started' : 'Sign In'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
