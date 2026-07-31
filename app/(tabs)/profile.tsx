// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { colors, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { signOut } from '../../src/services/auth';
import { getProfile, getUserPoints } from '../../src/services/profile';
import { getCurrentStreak } from '../../src/services/streak';

type PointSummary = {
  totalPoints: number;
  rank: string;
  sessionsCompleted: number;
  quizzesCompleted: number;
};

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || 'Student';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function SettingsRow({
  icon,
  label,
  color = colors.primary,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center" style={{ paddingVertical: 14 }}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}12` }}>
        {icon}
      </View>
      <Text className="ml-4 flex-1 text-lg font-semibold" style={{ color: color === colors.danger ? colors.danger : colors.text }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={24} color="#8A92A3" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const plan = useUserPlan(user?.id);
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.user_metadata?.full_name ?? '');
  const [examType, setExamType] = useState('JAMB');
  const [points, setPoints] = useState<PointSummary>({
    totalPoints: 0,
    rank: 'Beginner',
    sessionsCompleted: 0,
    quizzesCompleted: 0
  });
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [profile, userPoints, currentStreak] = await Promise.all([
          getProfile(user.id),
          getUserPoints(user.id),
          getCurrentStreak(user.id)
        ]);

        if (!mounted) return;
        setEmail(profile?.email ?? user.email ?? '');
        setName(profile?.full_name ?? user.user_metadata?.full_name ?? '');
        setExamType(profile?.exam_type ?? 'JAMB');
        setPoints(userPoints);
        setStreak(currentStreak);
      } catch (err) {
        if (!mounted) return;
        Alert.alert('Unable to load profile', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      Alert.alert('Unable to log out', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.white }}>
        <Text className="text-lg font-bold" style={{ color: colors.ink }}>You are not signed in.</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: colors.muted }}>
          Please log in to access your profile and account settings.
        </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-6 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.primary }}>
          <Text className="font-bold text-white">Go to login</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = name || email.split('@')[0] || 'Student';
  const initials = getInitials(displayName, email);
  const planLabel = plan.isLoading ? 'Loading...' : plan.isPro ? 'Pro' : 'Free';

  return (
    <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.white, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center justify-end">
        <Pressable
          onPress={() => router.push('/account-settings')}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Ionicons name="settings-outline" size={30} color={colors.text} />
        </Pressable>
      </View>

      <View className="items-center">
        <View
          className="items-center justify-center rounded-full border-[7px] border-white"
          style={{
            height: 126,
            width: 126,
            backgroundColor: colors.primary,
            ...shadow
          }}
        >
          <Text className="text-5xl font-extrabold text-white">{initials}</Text>
        </View>

        <Text className="text-center text-4xl font-extrabold" style={{ marginTop: 12, color: colors.ink }}>
          {displayName}
        </Text>

        <View className="mt-4 flex-row items-center rounded-full px-5 py-3" style={{ backgroundColor: colors.primarySoft }}>
          <Ionicons name="school" size={21} color={colors.primary} />
          <Text className="ml-3 text-lg font-bold" style={{ color: colors.primary }}>
            {examType} Preparation
          </Text>
        </View>
      </View>

      <View className="mt-8 flex-row items-center rounded-3xl border bg-white p-5" style={{ borderColor: colors.softLine }}>
        <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#FFF8E8' }}>
          <MaterialCommunityIcons name="crown" size={34} color="#D99A16" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-lg font-medium" style={{ color: colors.muted }}>Current Plan</Text>
          <Text className="text-3xl font-extrabold" style={{ color: colors.ink }}>{planLabel}</Text>
        </View>
        {!plan.isPro ? (
          <Pressable
            onPress={() => router.push('/upgrade')}
            className="flex-row items-center rounded-full border px-4 py-3"
            style={{ borderColor: '#D6A72F', backgroundColor: '#FFFCF2' }}
          >
            <MaterialCommunityIcons name="auto-fix" size={18} color="#A66B00" />
            <Text className="ml-2 text-base font-bold" style={{ color: '#8A5A00' }}>Upgrade to Pro</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: space.medium, flexDirection: 'row', gap: 8 }}>
        <View className="flex-1 items-center rounded-3xl border bg-white px-2 py-5" style={{ borderColor: colors.softLine }}>
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Ionicons name="star-outline" size={27} color={colors.primary} />
          </View>
          <Text className="mt-4 text-3xl font-extrabold" style={{ color: colors.ink }}>{formatNumber(points.totalPoints)}</Text>
          <Text className="mt-1 text-base" style={{ color: colors.muted }}>Total Points</Text>
        </View>
        <View className="flex-1 items-center rounded-3xl border bg-white px-2 py-5" style={{ borderColor: colors.softLine }}>
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Ionicons name="stats-chart" size={27} color={colors.primary} />
          </View>
          <Text className="mt-4 text-3xl font-extrabold" style={{ color: colors.ink }}>{formatNumber(points.sessionsCompleted)}</Text>
          <Text className="mt-1 text-base" style={{ color: colors.muted }}>Sessions</Text>
        </View>
        <View className="flex-1 items-center rounded-3xl border bg-white px-2 py-5" style={{ borderColor: colors.softLine }}>
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Ionicons name="flame-outline" size={28} color={colors.primary} />
          </View>
          <Text className="mt-4 text-3xl font-extrabold" style={{ color: colors.ink }}>{formatNumber(streak)}</Text>
          <Text className="mt-1 text-base" style={{ color: colors.muted }}>Day Streak</Text>
        </View>
      </View>

      <Text className="text-2xl font-extrabold" style={{ marginTop: space.medium, color: colors.ink }}>Settings</Text>

      <View className="mt-4 rounded-3xl border bg-white px-5" style={{ borderColor: colors.softLine }}>
        <SettingsRow
          label="Account Settings"
          icon={<Ionicons name="person-outline" size={27} color={colors.primary} />}
          onPress={() => router.push('/account-settings')}
        />
        <View className="h-px ml-16" style={{ backgroundColor: colors.softLine }} />
        <SettingsRow
          label="Exam Goals"
          icon={<Ionicons name="locate-outline" size={27} color={colors.primary} />}
          onPress={() => router.push('/exam-goals')}
        />
        <View className="h-px ml-16" style={{ backgroundColor: colors.softLine }} />
        <SettingsRow
          label="Notifications"
          icon={<Ionicons name="notifications-outline" size={27} color={colors.primary} />}
          onPress={() => router.push('/notifications')}
        />
        <View className="h-px ml-16" style={{ backgroundColor: colors.softLine }} />
        <SettingsRow
          label="Help & Support"
          icon={<Ionicons name="help-circle-outline" size={27} color={colors.primary} />}
          onPress={() => router.push('/help-support')}
        />
        <View className="h-px ml-16" style={{ backgroundColor: colors.softLine }} />
        <SettingsRow
          label="Logout"
          color={colors.danger}
          icon={<Ionicons name="log-out-outline" size={27} color={colors.danger} />}
          onPress={handleLogout}
        />
      </View>
    </ScreenScrollView>
  );
}
