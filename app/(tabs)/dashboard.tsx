// Prepcore — Live Data & Polish
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { getDashboardData, type DashboardData } from '../../src/services/dashboard';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, Card, StatTile } from '../../src/components/PrepcoreUI';
import { CardSkeleton, LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

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

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try { setData(await getDashboardData(user.id)); }
    finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }, [user]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
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
  return (
    <ScreenScrollView
      className="flex-1 pt-8"
      style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} tintColor="#2563EB" colors={['#2563EB']} />}
    >
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Prepcore</Text>
      <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <View style={{ marginTop: space.large, padding: space.medium, borderRadius: 24, backgroundColor: colors.primary }}>
          <View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text style={{ color: colors.white, fontSize: 24, fontWeight: '700' }}>{greeting()},</Text><Text style={{ color: colors.white, fontSize: 24, fontWeight: '700' }}>{firstName}</Text></View><View className="rounded-full bg-white/20 px-4 py-2"><Text className="font-bold text-white">{preparation}</Text></View></View>
          <View className="bg-white" style={{ marginTop: space.large, padding: space.medium, borderRadius: 16 }}><View className="flex-row justify-between"><View><Text style={{ color: colors.text }}>Average score</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>{average}</Text></View><View><Text style={{ color: colors.text }}>Rank</Text><View className="mt-3 flex-row items-center rounded-full bg-[#EAF8EF] px-3 py-2"><Ionicons name="leaf" size={18} color={colors.success} /><Text className="ml-2" style={{ color: colors.text }}>{data.rank}</Text></View></View></View><ActionButton className="mt-6" onPress={() => router.push('/practice')}>Start Practice</ActionButton></View>
        </View>
      </Animated.View>
      <View style={{ marginTop: space.large, flexDirection: 'row', gap: space.medium }}><StatTile icon={<MaterialCommunityIcons name="help" size={22} color={colors.primary} />} value={String(data.totalQuestionsAnswered)} label="Questions Practiced" /><StatTile icon={<MaterialCommunityIcons name="file-document-outline" size={22} color={colors.primary} />} value={String(data.mockExamCount)} label="Mock Exams" /></View>
      <View style={{ marginTop: space.medium, flexDirection: 'row', gap: space.medium }}><StatTile icon={<Ionicons name="flame" size={23} color="#F97316" />} value={String(data.streak)} label="Study Streak" tint="#F97316" /><StatTile icon={<Ionicons name="stats-chart" size={22} color={colors.success} />} value={average} label="Average Score" tint={colors.success} /></View>
      <Text style={{ marginTop: space.xlarge, color: colors.ink, fontSize: 16, fontWeight: '600' }}>Recommended Practice</Text>
      <View style={{ marginTop: space.medium }}>{data.recommendation ? <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{data.recommendation.subject}</Text><Text className="mt-1" style={{ color: colors.text }}>Current accuracy: {data.recommendation.accuracy}%</Text><ActionButton className="mt-4" onPress={() => router.push('/practice')}>Tap to practice</ActionButton></Card> : <Card><EmptyState icon="book-outline" title="No recommendation yet" description="Complete a few practice sessions to get personalized recommendations." actionLabel="Go to Practice" onAction={() => router.push('/practice')} /></Card>}</View>
    </ScreenScrollView>
  );
}
