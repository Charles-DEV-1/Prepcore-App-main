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
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function routeUser() {
      console.log('Index: Auth state - isLoading:', isLoading, 'session:', !!session, 'user:', !!user);

      if (!isLoading) {
        const hasAuthState = Boolean(session || user);

        if (!hasAuthState) {
          console.log('Index: No active auth state, routing to login');
          router.replace('/(auth)/login');
          return;
        }

        const metadataIsOnboarded = Boolean(
          (user as any)?.onboarding_completed === true ||
          ((user as any)?.user_metadata?.onboarding_completed === true)
        );

        if (metadataIsOnboarded) {
          console.log('Index: User is onboarded, routing to dashboard');
          router.replace('/(tabs)/dashboard');
          return;
        }

        setCheckingProfile(true);

        try {
          const authUserId = session?.user?.id ?? user?.id;

          if (!authUserId) {
            console.warn('Index: No user id available for onboarding lookup');
            router.replace('/(auth)/login');
            return;
          }

          console.log('Index: Checking profile onboarding status for user:', authUserId);
          const { data, error } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', authUserId)
            .maybeSingle();

          if (error) {
            console.warn('Index: Supabase user query error:', error.message);
            throw error;
          }

          if (!mounted) return;

          const isOnboarded = data?.onboarding_completed === true;
          console.log('Index: Profile check complete - onboarded:', isOnboarded);

          if (!isOnboarded) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn('Index: Network or profile check failed:', message);
          if (mounted) setErrorMessage('Unable to reach Prepcore servers. Check your internet connection.');
        } finally {
          if (mounted) setCheckingProfile(false);
        }
      }
    }

    routeUser();

    // Set a 10-second timeout fallback for network issues
    timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Index: Auth load timeout, forcing route to login');
        setErrorMessage('Taking longer than expected. Continuing...');
          router.replace('/(auth)/login');
      }
    }, 10000);

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
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
