// Prepcore — Live Data & Polish
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { PillTabs, SubjectIcon } from '../../src/components/PrepcoreUI';
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

  return <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSubjects(true)} tintColor="#2563EB" colors={['#2563EB']} />}>
    <View className="flex-row items-center" style={{ gap: space.small }}><View className="flex-1"><PillTabs options={['JAMB', 'WAEC']} value={track} onChange={setTrack} /></View><CalculatorButton onPress={() => setCalculatorOpen(true)} /></View>
    <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    <Text style={{ marginTop: space.xlarge, color: colors.ink, fontSize: 24, fontWeight: '700' }}>Practice</Text><Text style={{ marginTop: space.small, color: colors.text }}>Choose a subject to begin</Text>
    <View className="flex-row items-center bg-white" style={{ marginTop: space.medium, minHeight: 58, paddingHorizontal: space.medium, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line }}><Ionicons name="search-outline" size={26} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search subjects..." placeholderTextColor="#8B929E" className="ml-3 flex-1" style={{ color: colors.text, fontSize: 14, paddingVertical: space.small }} /></View>
    {loading ? <View style={{ marginTop: space.large }}><CardSkeleton count={4} /></View> : filteredSubjects.length ? <View style={{ marginTop: space.large, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{filteredSubjects.map(subject => <Pressable key={subject.id} onPress={() => router.push(`/quiz?subjectId=${subject.id}`)} className="bg-white" style={{ width: '47.5%', minHeight: 110, marginBottom: space.medium, padding: space.medium, borderRadius: radii.md, ...shadow }}><View><SubjectIcon subject={subject.label} /><View className="rounded-full px-2 py-1" style={{ position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary }}><Text className="text-center text-xs font-bold text-white">{subject.questionCount.toLocaleString()}{'\n'}Questions</Text></View></View><Text numberOfLines={2} style={{ marginTop: space.medium, color: colors.ink, fontSize: 16, fontWeight: '600' }}>{subject.label}</Text></Pressable>)}</View> : <EmptyState icon="search-outline" title="No subjects found" description={query ? 'Try a different subject name.' : `No ${track} subjects are available yet.`} />}
  </ScreenScrollView>;
}
