// Prepcore — Live Data & Polish
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { getDashboardData, type DashboardData } from '../../src/services/dashboard';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, Card, StatTile } from '../../src/components/PrepcoreUI';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardSkeleton, LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { MotionContainer } from '../../src/components/AnimatedMotion';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const hasLoaded = useRef(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const next = await getDashboardData(user.id);
      setData(next);
      hasLoaded.current = true;
    }
    finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void loadDashboard(hasLoaded.current);
    return undefined;
  }, [loadDashboard]));
  useEffect(() => {
    if (!loading) Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [entrance, loading]);

  if (loading) return <View style={{ flex: 1, padding: space.medium, backgroundColor: colors.page }}><LoadingSkeleton height={230} /><View style={{ marginTop: 16 }}><CardSkeleton count={3} /></View></View>;
  if (!data) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.page }}><EmptyState icon="cloud-offline-outline" title="Dashboard unavailable" description="Pull down to try loading your study data again." /></View>;

  const firstName = data.userName.split(' ')[0];
  const preparation = data.examGoals || (data.examType ? `${data.examType} Preparation` : 'Preparation');
  const average = data.averageScore === null ? '—' : `${data.averageScore}%`;
  const profileLabel = ((user?.user_metadata?.full_name as string | undefined) || user?.email || 'U').trim().charAt(0).toUpperCase();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView
      className="flex-1"
      style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }}
      contentContainerStyle={{ paddingTop: space.md, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Prepcore</Text>
        <Pressable onPress={() => router.push('/profile')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}>{profileLabel}</Text>
        </Pressable>
      </View>
      <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <MotionContainer delay={80} distance={10}>
          <View style={{ marginTop: space.sm, padding: space.lg, borderRadius: 20, backgroundColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}><View style={{ flex: 1, paddingRight: space.md }}><Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{greeting()},</Text><Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{firstName}</Text></View><View style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: space.md, paddingVertical: space.sm }}><Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{preparation}</Text></View></View>
          <View style={{ marginTop: space.md, backgroundColor: colors.surface, padding: space.md, borderRadius: 16 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={{ color: colors.textSecondary, fontSize: 13 }}>Average score</Text><Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700' }}>{average}</Text></View><View><Text style={{ color: colors.textSecondary, fontSize: 13 }}>Rank</Text><View style={{ marginTop: space.sm, flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: colors.successSoft, paddingHorizontal: space.md, paddingVertical: space.sm }}><Ionicons name="leaf" size={18} color={colors.success} /><Text style={{ marginLeft: space.sm, color: colors.text }}>{data.rank}</Text></View></View></View><ActionButton className="mt-4" onPress={() => router.push('/practice')}>Start Practice</ActionButton></View>
          </View>
        </MotionContainer>
      </Animated.View>
      <View style={{ marginTop: space.sm, flexDirection: 'row', gap: space.medium }}>
        <MotionContainer delay={120} distance={8}><StatTile icon={<MaterialCommunityIcons name="help" size={22} color={colors.primary} />} value={String(data.totalQuestionsAnswered)} label="Questions Practiced" /></MotionContainer>
        <MotionContainer delay={160} distance={8}><StatTile icon={<MaterialCommunityIcons name="file-document-outline" size={22} color={colors.primary} />} value={String(data.mockExamCount)} label="Mock Exams" /></MotionContainer>
      </View>
      <View style={{ marginTop: space.sm, flexDirection: 'row', gap: space.medium }}>
        <MotionContainer delay={200} distance={8}><StatTile icon={<Ionicons name="flame" size={23} color="#F97316" />} value={String(data.streak)} label="Study Streak" tint="#F97316" /></MotionContainer>
        <MotionContainer delay={240} distance={8}><StatTile icon={<Ionicons name="stats-chart" size={22} color={colors.success} />} value={average} label="Average Score" tint={colors.success} /></MotionContainer>
      </View>
      <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 16, fontWeight: '600' }}>Quick actions</Text>
      <QuickActions router={router} />
      <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 16, fontWeight: '600' }}>Recommended Practice</Text>
      <View style={{ marginTop: space.xs }}>{data.recommendation ? <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{data.recommendation.subject}</Text><Text style={{ marginTop: 4, color: colors.textSecondary }}>Current accuracy: {data.recommendation.accuracy}%</Text><ActionButton className="mt-4" onPress={() => router.push('/practice')}>Tap to practice</ActionButton></Card> : <Card><EmptyState icon="book-outline" title="No recommendation yet" description="Complete a few practice sessions to get personalized recommendations." actionLabel="Go to Practice" onAction={() => router.push('/practice')} /></Card>}</View>
    </ScreenScrollView>
    </SafeAreaView>
  );
}

function QuickActions({ router }: { router: ReturnType<typeof useRouter> }) {
  const actions = [
    ['Practice', 'Start a new set', 'play-circle-outline', '/practice'], ['Mock Exam', 'Timed practice', 'document-text-outline', '/exam'],
    ['Flashcards', 'Review decks', 'layers-outline', '/flashcards'], ['Weekly Quiz', 'Try this week', 'trophy-outline', '/weekly-quiz'],
    ['Leaderboard', 'See your rank', 'podium-outline', '/leaderboard'], ['Upgrade', 'Unlock Pro', 'star-outline', '/upgrade'],
  ] as const;
  return <View style={{ marginTop: space.sm, gap: space.sm }}>{[0, 2, 4].map((start, row) => <View key={start} style={{ flexDirection: 'row', gap: space.sm }}>
    {actions.slice(start, start + 2).map(([title, subtitle, icon, route], column) => <MotionContainer key={title} delay={280 + (row * 2 + column) * 40} distance={8} style={{ flex: 1 }}>
      <Pressable onPress={() => router.push(route)} style={{ minHeight: 122, borderRadius: 18, padding: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine, justifyContent: 'space-between' }}>
        <View style={{ height: 34, width: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={19} color={colors.primary} /></View>
        <View><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15 }}>{title}</Text><Text style={{ marginTop: 3, color: colors.textSecondary, fontSize: 12 }}>{subtitle}</Text></View>
      </Pressable>
    </MotionContainer>)}
  </View>)}</View>;
}
