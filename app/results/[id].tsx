import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getResults } from '../../src/services/results';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, BrandMark, Card } from '../../src/components/PrepcoreUI';
import { colors } from '../../src/constants/theme';

type ResultData = Awaited<ReturnType<typeof getResults>>;

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id || id === 'preview' || id === 'practice-preview') {
        setLoading(false);
        return;
      }

      try {
        const result = await getResults(id);
        if (mounted) setData(result);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0D1428' }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  const score = data?.score ?? 0;
  const totalQuestions = data?.totalQuestions ?? 0;
  const correctCount = data?.correctCount ?? 0;
  const wrongCount = Math.max(totalQuestions - correctCount, 0);
  const skipped = 0;

  return (
    <ScreenScrollView className="flex-1 px-4 pt-7" style={{ backgroundColor: '#0D1428' }} contentContainerStyle={{ paddingBottom: 80 }}>
      <BrandMark size={56} showName dark />
      <Text className="mt-14 text-center text-5xl font-extrabold text-white">Great performance!</Text>

      <View className="mt-12 items-center justify-center">
        <View className="h-72 w-72 items-center justify-center rounded-full" style={{ borderWidth: 10, borderColor: '#E7F1FF', shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 28 }}>
          <Text className="text-7xl font-extrabold text-white">{score}%</Text>
        </View>
      </View>

      <View className="mt-12 flex-row gap-3">
        {[
          ['Correct', correctCount, colors.success],
          ['Wrong', wrongCount, colors.danger],
          ['Skipped', skipped, '#98A2B3']
        ].map(([label, value, tint]) => (
          <View key={String(label)} className="flex-1 items-center rounded-2xl bg-white p-4">
            <Text className="text-2xl" style={{ color: colors.text }}>{label}</Text>
            <Text className="mt-3 text-4xl font-extrabold" style={{ color: String(tint) }}>{String(value)}</Text>
          </View>
        ))}
      </View>

      <ActionButton className="mt-10" onPress={() => router.push('/progress')}>View Detailed Analysis</ActionButton>
      <ActionButton variant="outline" className="mt-5" onPress={() => router.push('/practice')}>Retake Exam</ActionButton>

      <Card className="mt-8">
        <Text className="text-xl font-extrabold" style={{ color: colors.ink }}>Subject breakdown</Text>
        <View className="mt-4 space-y-3">
          {(data?.subjectStats ?? []).map(subject => (
            <View key={subject.label}>
              <View className="flex-row justify-between">
                <Text className="font-bold" style={{ color: colors.text }}>{subject.label}</Text>
                <Text className="font-bold" style={{ color: colors.primary }}>{subject.percent}%</Text>
              </View>
              <View className="mt-2 h-3 overflow-hidden rounded-full" style={{ backgroundColor: colors.primarySoft }}>
                <View className="h-full rounded-full" style={{ width: `${subject.percent}%`, backgroundColor: colors.primary }} />
              </View>
            </View>
          ))}
          {!data?.subjectStats.length ? <Text style={{ color: colors.muted }}>No answer breakdown found.</Text> : null}
        </View>
      </Card>

      <Pressable onPress={() => router.push('/dashboard')} className="mt-6 items-center">
        <Text className="font-bold text-white">Back to Home</Text>
      </Pressable>
    </ScreenScrollView>
  );
}
