import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/lib/supabase';
import { ensureUserProfile, getOnboardingStatus } from '../../src/services/auth';
import { completePendingOnboarding } from '../../src/services/onboarding';

WebBrowser.maybeCompleteAuthSession();

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

export default function AuthCallbackScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    let mounted = true;
    let handled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    async function finishAuthenticatedSession() {
      if (mounted) setMessage('Saving your prep plan...');
      const profile = await ensureUserProfile();
      if (!profile) throw new Error('Your session could not be verified. Please try again.');
      const onboardingCompleted = await completePendingOnboarding();
      const isOnboarded = onboardingCompleted || await getOnboardingStatus();
      router.replace(isOnboarded ? '/(tabs)/dashboard' : '/(auth)/onboarding');
    }

    async function completeAuth(url: string | null) {
      if (handled) return;

      try {
        if (!url) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            handled = true;
            await finishAuthenticatedSession();
            return;
          }
          if (mounted) setMessage('Waiting for the verification link...');
          return;
        }

        const params = getParamsFromUrl(url);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const verificationType = params.get('type');
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error_code');

        if (!accessToken && !refreshToken && !code && !tokenHash && !errorDescription && !errorCode) {
          if (mounted) setMessage('Waiting for the verification link...');
          return;
        }

        handled = true;

        if (errorDescription || errorCode) {
          if (mounted) setMessage(errorDescription || errorCode || 'Authentication failed');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            if (mounted) setMessage('Session error: ' + error.message);
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            if (mounted) setMessage('Code exchange failed: ' + error.message);
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        } else if (tokenHash) {
          const supportedTypes = ['signup', 'magiclink', 'invite', 'recovery', 'email_change'] as const;
          const type = supportedTypes.includes(verificationType as typeof supportedTypes[number])
            ? verificationType as typeof supportedTypes[number]
            : 'signup';
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

          if (error) {
            if (mounted) setMessage('Email verification failed: ' + error.message);
            fallbackTimer = setTimeout(() => router.replace('/(auth)/login'), 8000);
            return;
          }
        } else {
          const {
            data: { session }
          } = await supabase.auth.getSession();

          if (!session) {
            if (mounted) setMessage('Missing sign-in tokens. Please try again.');
            fallbackTimer = setTimeout(() => router.replace('/(auth)/login'), 8000);
            return;
          }
        }

        await finishAuthenticatedSession();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unexpected error occurred';
        if (mounted) setMessage('Error: ' + errorMsg);
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    }

    const subscription = Linking.addEventListener('url', event => {
      if (__DEV__) console.log('[AUTH] deep-link received', { url: event.url.replace(/(access_token|refresh_token|token_hash|code)=[^&]*/g, '$1=[redacted]') });
      void completeAuth(event.url);
    });
    const routeQuery = new URLSearchParams();
    Object.entries(routeParams).forEach(([key, value]) => {
      const resolvedValue = Array.isArray(value) ? value[0] : value;
      if (resolvedValue !== undefined) routeQuery.set(key, resolvedValue);
    });
    const routeUrl = routeQuery.toString() ? `prepcore://auth/callback?${routeQuery.toString()}` : null;
    void Linking.getInitialURL().then(url => {
      if (__DEV__) console.log('[AUTH] initial deep-link', { hasUrl: Boolean(url), path: url?.split('?')[0] ?? null });
      void completeAuth(url ?? routeUrl);
    });
    fallbackTimer = setTimeout(() => {
      if (!handled && mounted) {
        setMessage('The verification link did not reach the app. Please open it again or request a new link.');
        router.replace('/(auth)/login');
      }
    }, 15000);

    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.remove();
    };
  }, [routeParams, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#185FA5] px-6">
      <ActivityIndicator color="#FFFFFF" size="large" />
      <Text className="mt-4 text-center text-base text-white">{message}</Text>
    </View>
  );
}
