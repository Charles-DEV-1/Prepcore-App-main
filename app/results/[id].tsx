import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getResults } from '../../src/services/results';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, BrandMark, Card } from '../../src/components/PrepcoreUI';
import { colors, radii } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionContainer } from '../../src/components/AnimatedMotion';
import CircularScore from '../../src/components/CircularScore';
import ParticleRing from '../../src/components/ParticleRing';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1428' }}>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0D1428' }}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  const score = data?.score ?? 0;
  const totalQuestions = data?.totalQuestions ?? 0;
  const correctCount = data?.correctCount ?? 0;
  const wrongCount = Math.max(totalQuestions - correctCount, 0);
  const skipped = 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1428' }}>
    <ScreenScrollView className="flex-1 px-4 pt-7" style={{ backgroundColor: '#0D1428', paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 80 }}>
      <MotionContainer delay={60} distance={12}>
        <BrandMark size={56} showName dark />
      </MotionContainer>
      <MotionContainer delay={100} distance={10}>
        <Text className="mt-14 text-center text-5xl font-extrabold text-white">Great performance!</Text>
      </MotionContainer>

      <View className="mt-12 items-center justify-center" style={{ height: 260 }}>
        <MotionContainer delay={140} distance={18} style={{ position: 'absolute', alignSelf: 'center' }}>
          <ParticleRing size={260} count={28} burstCount={8} color="#DDEEFF" />
        </MotionContainer>
        <MotionContainer delay={160} distance={12}>
          <CircularScore percent={score} size={220} strokeWidth={12} color={colors.primary} />
        </MotionContainer>
      </View>

      <View style={{ marginTop: space.xl, flexDirection: 'row', gap: space.small }}>
        {[
          ['Correct', correctCount, colors.success],
          ['Wrong', wrongCount, colors.danger],
          ['Skipped', skipped, '#98A2B3']
        ].map(([label, value, tint], index) => (
          <MotionContainer key={String(label)} delay={180 + index * 60} distance={8}>
            <View style={{ flex: 1, alignItems: 'center', borderRadius: radii.large, backgroundColor: colors.surface, padding: space.md }}>
              <Text className="text-2xl" style={{ color: colors.text }}>{label}</Text>
              <Text className="mt-3 text-4xl font-extrabold" style={{ color: String(tint) }}>{String(value)}</Text>
            </View>
          </MotionContainer>
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
    </SafeAreaView>
  );
}
