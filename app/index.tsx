import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/lib/supabase';

export default function Index() {
  const { session, user, isLoading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function routeUser() {
      if (__DEV__) console.log('[AUTH] navigation decision', { isLoading, hasSession: Boolean(session), hasUser: Boolean(user) });

      if (!isLoading) {
        const hasAuthState = Boolean(session || user);

        if (!hasAuthState) {
          if (__DEV__) console.log('[AUTH] no session, navigating to login');
          router.replace('/(auth)/login');
          return;
        }

        const metadataIsOnboarded = Boolean(
          (user as any)?.onboarding_completed === true ||
          ((user as any)?.user_metadata?.onboarding_completed === true)
        );

        if (metadataIsOnboarded) {
          if (__DEV__) console.log('[AUTH] onboarded user, navigating to dashboard');
          router.replace('/(tabs)/dashboard');
          return;
        }

        setCheckingProfile(true);

        try {
          const authUserId = session?.user?.id ?? user?.id;

          if (!authUserId) {
            if (__DEV__) console.warn('[AUTH] no user id available for profile lookup');
            router.replace('/(auth)/login');
            return;
          }

          if (__DEV__) console.log('[AUTH] checking profile onboarding status');
          const { data, error } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', authUserId)
            .maybeSingle();

          if (error) {
            if (__DEV__) console.warn('[AUTH] profile query error:', error.message);
            throw error;
          }

          if (!mounted) return;

          const isOnboarded = data?.onboarding_completed === true;
          if (__DEV__) console.log('[AUTH] profile status', { isOnboarded });

          if (!isOnboarded) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          if (__DEV__) console.warn('[AUTH] profile routing failed:', message);
          if (mounted) setErrorMessage('Unable to reach Prepcore servers. Check your internet connection.');
        } finally {
          if (mounted) setCheckingProfile(false);
        }
      }
    }

    routeUser();

    return () => {
      mounted = false;
    };
  }, [isLoading, session, user, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#185FA5] px-6">
      <ActivityIndicator color="#FFFFFF" size="large" />
      <Text className="mt-4 text-white text-base text-center">
        {checkingProfile ? 'Checking your Prepcore profile...' : 'Preparing your Prepcore experience...'}
      </Text>
      {errorMessage ? (
        <Text className="mt-4 text-center text-sm text-yellow-100">{errorMessage}</Text>
      ) : null}
    </View>
  );
}
