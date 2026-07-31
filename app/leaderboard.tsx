// Prepcore — Live Data & Polish
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { getAllTimeLeaderboard, getCurrentQuiz, getLeaderboard, type LeaderboardEntry } from '../src/services/weeklyQuiz';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { BrandMark, PillTabs } from '../src/components/PrepcoreUI';
import { CardSkeleton } from '../src/components/LoadingSkeleton';
import { EmptyState } from '../src/components/EmptyState';
import { colors, radii } from '../src/constants/theme';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('Weekly');

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      if (range === 'Weekly') {
        const quiz = await getCurrentQuiz();
        setEntries(quiz ? await getLeaderboard(quiz.id, user.id) : []);
      } else setEntries(await getAllTimeLeaderboard(user.id));
    } finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }, [range, user]);

  useEffect(() => { void load(); }, [load]);
  if (loading) return <View className="flex-1 bg-white p-5"><CardSkeleton count={5} /></View>;

  return <ScreenScrollView className="flex-1 bg-white px-5 pt-10" contentContainerStyle={{ paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#2563EB" colors={['#2563EB']} />}>
    <BrandMark size={44} />
    <View className="mx-auto mt-8 w-72"><PillTabs options={['Weekly', 'All-time']} value={range} onChange={setRange} /></View>
    <Text className="mt-7 text-center text-5xl font-extrabold" style={{ color: colors.text }}>Leaderboard</Text>
    {!entries.length ? <EmptyState icon="trophy-outline" title="No leaderboard entry yet" description={range === 'Weekly' ? "Join this week's quiz to see your rank." : 'Points will appear here as learners complete sessions.'} /> : <View style={{ marginTop: 28, gap: 10 }}>{entries.map((entry, index) => <View key={entry.user_id} className="flex-row items-center rounded-2xl px-4 py-4" style={{ backgroundColor: entry.is_me ? '#E4F1FF' : colors.white, borderWidth: 1, borderColor: colors.softLine }}><Text className="w-10 text-xl" style={{ color: colors.text }}>{index + 1}</Text><View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: entry.is_me ? colors.primary : index < 3 ? '#F59E0B' : colors.success }}><Text className="text-xl font-extrabold text-white">{entry.user_name.charAt(0)}</Text></View><View className="ml-4 flex-1"><Text className="text-base font-bold" style={{ color: colors.text }}>{entry.is_me ? 'You' : entry.user_name}</Text><Text style={{ color: colors.muted }}>{entry.rank_name}</Text></View><Text className="text-base font-bold" style={{ color: colors.text }}>{range === 'Weekly' ? `${entry.score}/${entry.total_questions}` : `${entry.score} pts`}</Text></View>)}</View>}
    {entries.find(entry => entry.is_me) ? <View className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.primarySoft, borderRadius: radii.md }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Your rank: #{entries.findIndex(entry => entry.is_me) + 1}</Text></View> : null}
  </ScreenScrollView>;
}
