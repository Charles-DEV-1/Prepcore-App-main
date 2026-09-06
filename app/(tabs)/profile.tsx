// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { MotionContainer } from '../../src/components/AnimatedMotion';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { signOut } from '../../src/services/auth';
import { getProfile, getUserPoints } from '../../src/services/profile';
import { getCurrentStreak } from '../../src/services/streak';
import { removeDevicePushTokens } from '../../src/services/notifications';

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
        setExamType(String(profile?.exam_type ?? 'JAMB').toUpperCase());
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
      try { if (user) await removeDevicePushTokens(user.id); } catch { /* Sign-out must still complete if token cleanup is unavailable. */ }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.background, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center justify-end">
        <Pressable
          onPress={() => router.push('/account-settings')}
          style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View className="items-center">
        <MotionContainer delay={70} distance={10}>
        <View
          style={{
            height: 120,
            width: 120,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            borderWidth: 6,
            borderColor: colors.surface,
            ...shadow
          }}
        >
          <Text style={{ color: colors.white, fontSize: 36, fontWeight: '700' }}>{initials}</Text>
        </View>
        </MotionContainer>

        <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
          {displayName}
        </Text>

        <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.primarySoft }}>
          <Ionicons name="school" size={20} color={colors.primary} />
          <Text style={{ marginLeft: space.sm, color: colors.primary, fontSize: 14, fontWeight: '700' }}>
            {examType} Preparation
          </Text>
        </View>
      </View>

      <MotionContainer delay={120} distance={8}>
      <View style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, padding: space.lg }}>
        <View style={{ height: 56, width: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#FFF8E8' }}>
          <MaterialCommunityIcons name="crown" size={28} color="#D99A16" />
        </View>
        <View style={{ marginLeft: space.md, flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Current Plan</Text>
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700' }}>{planLabel}</Text>
        </View>
        {!plan.isPro ? (
          <Pressable
            onPress={() => router.push('/upgrade')}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#D6A72F', backgroundColor: '#FFFCF2', paddingHorizontal: space.md, paddingVertical: space.sm }}
          >
            <MaterialCommunityIcons name="auto-fix" size={16} color="#A66B00" />
            <Text style={{ marginLeft: space.sm, color: '#8A5A00', fontSize: 13, fontWeight: '700' }}>Upgrade to Pro</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/upgrade')}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: space.md, paddingVertical: space.sm }}
          >
            <MaterialCommunityIcons name="credit-card-outline" size={16} color={colors.primary} />
            <Text style={{ marginLeft: space.sm, color: colors.primary, fontSize: 13, fontWeight: '700' }}>Manage subscription</Text>
          </Pressable>
        )}
      </View>
      </MotionContainer>

      <View style={{ marginTop: space.xl, flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1, alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, paddingHorizontal: space.sm, paddingVertical: space.lg }}>
          <View style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.primarySoft }}>
            <Ionicons name="star-outline" size={22} color={colors.primary} />
          </View>
          <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 18, fontWeight: '700' }}>{formatNumber(points.totalPoints)}</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 13 }}>Total Points</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, paddingHorizontal: space.sm, paddingVertical: space.lg }}>
          <View style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.primarySoft }}>
            <Ionicons name="stats-chart" size={22} color={colors.primary} />
          </View>
          <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 18, fontWeight: '700' }}>{formatNumber(points.sessionsCompleted)}</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 13 }}>Sessions</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, paddingHorizontal: space.sm, paddingVertical: space.lg }}>
          <View style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.primarySoft }}>
            <Ionicons name="flame-outline" size={22} color={colors.primary} />
          </View>
          <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 18, fontWeight: '700' }}>{formatNumber(streak)}</Text>
          <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 13 }}>Day Streak</Text>
        </View>
      </View>

      <View style={{ marginTop: space.xl, borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, padding: space.lg }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Study snapshot</Text>
        <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="trophy-outline" size={18} color={colors.primary} />
          <Text style={{ marginLeft: space.sm, color: colors.textSecondary }}>Leaderboard rank: {points.rank}</Text>
        </View>
        <View style={{ marginTop: space.sm, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="book-outline" size={18} color={colors.primary} />
          <Text style={{ marginLeft: space.sm, color: colors.textSecondary }}>Weekly quiz completions: {points.quizzesCompleted}</Text>
        </View>
      </View>

      <Text style={{ marginTop: space.xl, color: colors.ink, fontSize: 18, fontWeight: '700' }}>Settings</Text>

      <View style={{ marginTop: space.md, borderRadius: radii.large, borderWidth: 1, borderColor: colors.softLine, backgroundColor: colors.surface, paddingHorizontal: space.lg }}>
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
    </SafeAreaView>
  );
}
