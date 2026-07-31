import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/lib/supabase';
import { ensureUserProfile } from '../../src/services/auth';

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
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    async function completeAuth() {
      try {
        const url = await Linking.getInitialURL();

        if (!url) {
          setMessage('Missing sign-in response. Please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        const params = getParamsFromUrl(url);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const code = params.get('code');
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error_code');

        if (errorDescription || errorCode) {
          setMessage(errorDescription || errorCode || 'Authentication failed');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setMessage('Session error: ' + error.message);
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setMessage('Code exchange failed: ' + error.message);
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        } else {
          const {
            data: { session }
          } = await supabase.auth.getSession();

          if (!session) {
            setMessage('Missing sign-in tokens. Please try again.');
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        }

        setMessage('Creating profile...');
        await ensureUserProfile();
        router.replace('/');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unexpected error occurred';
        setMessage('Error: ' + errorMsg);
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    }

    completeAuth();
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#185FA5] px-6">
      <ActivityIndicator color="#FFFFFF" size="large" />
      <Text className="mt-4 text-center text-base text-white">{message}</Text>
    </View>
  );
}
