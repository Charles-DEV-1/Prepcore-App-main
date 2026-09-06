// Prepcore — Live Data & Polish
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { AppTextInput, PillTabs, SubjectIcon } from '../../src/components/PrepcoreUI';
import { CardSkeleton } from '../../src/components/LoadingSkeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { CalculatorButton, CalculatorModal } from '../../src/components/CalculatorModal';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

export default function PracticeScreen() {
  const router = useRouter();
  const [track, setTrack] = useState('JAMB');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [subjects, setSubjects] = useState<LiveSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 200); return () => clearTimeout(timer); }, [query]);
  const loadSubjects = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try { setSubjects(await getSubjectsWithQuestionCounts(track)); } finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }, [track]);
  useEffect(() => { void loadSubjects(); }, [loadSubjects]);
  const filteredSubjects = useMemo(() => subjects.filter(subject => subject.label.toLowerCase().includes(debouncedQuery.trim().toLowerCase())), [debouncedQuery, subjects]);

  return <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSubjects(true)} tintColor={colors.primary} colors={[colors.primary]} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}><View style={{ flex: 1 }}><PillTabs options={['JAMB', 'WAEC']} value={track} onChange={setTrack} /></View><CalculatorButton onPress={() => setCalculatorOpen(true)} /></View>
    <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    <Text style={{ marginTop: space.xlarge, color: colors.ink, fontSize: 24, fontWeight: '700' }}>Practice</Text><Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Choose a subject to begin</Text>
    <View style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="search-outline" size={20} color={colors.muted} /><AppTextInput value={query} onChangeText={setQuery} placeholder="Search subjects..." style={{ flex: 1, marginLeft: space.sm }} /></View>
    {loading ? <View style={{ marginTop: space.large }}><CardSkeleton count={4} /></View> : filteredSubjects.length ? <View style={{ marginTop: space.large, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{filteredSubjects.map(subject => <Pressable key={subject.id} onPress={() => router.push(`/quiz?subjectId=${subject.id}`)} style={({ pressed }) => ({ width: '47.5%', minHeight: 132, marginBottom: space.lg, padding: space.lg, borderRadius: radii.large, backgroundColor: pressed ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: pressed ? colors.primary : colors.softLine, transform: [{ scale: pressed ? 0.985 : 1 }], ...shadow })}><View style={{ flex: 1 }}><SubjectIcon subject={subject.label} /><Text numberOfLines={2} style={{ marginTop: space.lg, color: colors.ink, fontSize: 16, fontWeight: '700' }}>{subject.label}</Text><View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Start practice</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} style={{ marginLeft: 5 }} /></View></View></Pressable>)}</View> : <View style={{ marginTop: space.xl }}><EmptyState icon="search-outline" title="No subjects found" description={query ? 'Try a different subject name.' : `No ${track} subjects are available yet.`} /></View>}
  </ScreenScrollView>;
}
