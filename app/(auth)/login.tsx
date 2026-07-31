import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, TextInput } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureUserProfile } from '../../src/services/auth';
import { ActionButton, BrandMark } from '../../src/components/PrepcoreUI';
import { colors, radii, shadow } from '../../src/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = 'prepcore://auth/callback';
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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    router.replace('/');
  }

  async function handleGoogleSignIn() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
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

  async function handleSendOtp() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      const normalizedPhone = `+234${phone.replace(/[^0-9]/g, '').replace(/^0+/, '')}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      if (error) {
        setError(error.message);
        return;
      }
      setOtpSent(true);
      setStatus('OTP sent. Enter the code from your SMS.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      const normalizedPhone = `+234${phone.replace(/[^0-9]/g, '').replace(/^0+/, '')}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token: otp, type: 'sms' });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data.session) {
        setError('OTP verification failed. Please try again.');
        return;
      }
      await ensureUserProfile();
      await routeAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6">
      <View className="absolute left-0 right-0 top-0 h-56" style={{ backgroundColor: colors.primarySoft }} />
      <View className="flex-1 justify-center">
        <View className="items-center">
          <BrandMark size={86} />
          <Text className="mt-28 text-center text-5xl font-extrabold" style={{ color: colors.ink }}>Welcome back</Text>
        </View>

        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor="#A3AAB5"
          keyboardType="phone-pad"
          className="mt-10 bg-white px-5 text-lg"
          style={{ minHeight: 58, borderRadius: radii.md, color: colors.text, ...shadow }}
        />
        {otpSent ? (
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="OTP code"
            placeholderTextColor="#A3AAB5"
            keyboardType="number-pad"
            className="mt-4 bg-white px-5 text-lg"
            style={{ minHeight: 58, borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary, color: colors.text }}
          />
        ) : null}

        <ActionButton
          className="mt-7"
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          disabled={loading || (!phone && !otpSent) || (otpSent && !otp)}
        >
          {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Login'}
        </ActionButton>

        <Pressable className="mt-5 items-center" onPress={() => setOtpSent(false)}>
          <Text className="text-lg font-bold" style={{ color: colors.primary }}>Forgot password?</Text>
        </Pressable>

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

        <View className="mt-10 flex-row justify-center">
          <Text className="text-lg" style={{ color: colors.text }}>Don{"'"}t have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/onboarding')}>
            <Text className="text-lg font-bold" style={{ color: colors.primary }}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
