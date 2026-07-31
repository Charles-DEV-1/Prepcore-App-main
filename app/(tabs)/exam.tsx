// Prepcore — Live Data & Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { checkMockExamLimit, loadExamQuestions, submitExam } from '../../src/services/exam';
import type { Question } from '../../src/services/practice';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, Card } from '../../src/components/PrepcoreUI';
import { CalculatorButton, CalculatorModal } from '../../src/components/CalculatorModal';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

type Phase = 'setup' | 'exam' | 'submitting';

export default function MockExamScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = useUserPlan(user?.id);
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState<{ allowed: boolean; remaining: number } | null>(null);
  const [seconds, setSeconds] = useState(100 * 60);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    if (phase !== 'exam') return;
    if (seconds <= 0) {
      finishExam(answers);
      return;
    }
    const timer = setInterval(() => setSeconds(current => current - 1), 1000);
    return () => clearInterval(timer);
  }, [answers, phase, seconds]);

  async function startExam() {
    if (!user) {
      Alert.alert('Login required', 'Please sign in first.');
      return;
    }

    setLoading(true);
    try {
      const examLimit = await checkMockExamLimit(user.id, plan.isPro);
      setLimit(examLimit);
      if (!examLimit.allowed) return;

      const loaded = await loadExamQuestions();
      setQuestions(loaded);
      setAnswers({});
      setIndex(0);
      setSelected(null);
      setSeconds(100 * 60);
      setPhase('exam');
    } catch (err) {
      Alert.alert('Unable to start exam', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function finishExam(finalAnswers: Record<string, string>) {
    if (!user || phase === 'submitting') return;
    setPhase('submitting');
    try {
      const result = await submitExam(user.id, questions, finalAnswers);
      router.replace(`/results/${result.sessionId}`);
    } catch (err) {
      Alert.alert('Unable to submit exam', err instanceof Error ? err.message : 'Please try again.');
      setPhase('exam');
    }
  }

  function handleNext() {
    const question = questions[index];
    if (!question || !selected) return;
    const nextAnswers = { ...answers, [question.id]: selected };
    setAnswers(nextAnswers);

    if (index === questions.length - 1) {
      finishExam(nextAnswers);
      return;
    }

    setIndex(current => current + 1);
    setSelected(nextAnswers[questions[index + 1]?.id] ?? null);
  }

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  if (phase === 'submitting') {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.primary} />
        <Text className="mt-3" style={{ color: colors.muted }}>Calculating your result...</Text>
      </View>
    );
  }

  if (phase === 'exam') {
    const question = questions[index];
    const options = Object.entries(question?.options ?? {});

    return (
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b px-5 pb-4 pt-10" style={{ borderColor: colors.softLine }}>
          <Text className="flex-1 text-2xl font-extrabold" style={{ color: colors.text }}>JAMB Mock Exam</Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <CalculatorButton onPress={() => setCalculatorOpen(true)} />
            <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.dangerSoft }}>
              <Text className="text-xl font-extrabold" style={{ color: '#B42318' }}>{minutes}:{secs}</Text>
            </View>
          </View>
        </View>
        <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

        <ScreenScrollView className="flex-1 px-5 pt-7" contentContainerStyle={{ paddingBottom: 130 }}>
          <Text className="text-2xl" style={{ color: colors.text }}>Question {index + 1} of {questions.length}</Text>
          <View className="mt-5 flex-row flex-wrap gap-3">
            <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.primary }}>
              <Text className="text-lg font-bold text-white">{question?.subject_label ?? ''}</Text>
            </View>
            <View className="rounded-full border px-4 py-2" style={{ borderColor: colors.line }}>
              <Text className="text-lg" style={{ color: colors.text }}>{[question?.year, question?.topic].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>

          <Text className="mt-10 text-5xl font-extrabold" style={{ color: colors.text, lineHeight: 58 }}>{question?.prompt}</Text>

          <View className="mt-10 space-y-5">
            {options.map(([key, value]) => {
              const isSelected = selected === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelected(key)}
                  className="flex-row items-center bg-white px-5"
                  style={{
                    minHeight: 86,
                    borderRadius: radii.lg,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.line,
                    backgroundColor: isSelected ? colors.primarySoft : colors.white,
                    ...shadow
                  }}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                    <Text className="text-2xl font-extrabold text-white">{key}</Text>
                  </View>
                  <Text className="ml-5 flex-1 text-2xl" style={{ color: colors.text }}>{String(value)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScreenScrollView>

        <View className="absolute bottom-0 left-0 right-0 flex-row gap-4 bg-white px-5 pb-8 pt-4">
          <Pressable
            disabled={index === 0}
            onPress={() => {
              setIndex(current => current - 1);
              setSelected(answers[questions[index - 1]?.id] ?? null);
            }}
            className="h-16 w-16 items-center justify-center rounded-full border bg-white"
            style={{ borderColor: colors.line }}
          >
            <Ionicons name="flag-outline" size={34} color={colors.text} />
          </Pressable>
          <ActionButton variant="outline" disabled={index === 0} className="flex-1" onPress={() => {
            setIndex(current => current - 1);
            setSelected(answers[questions[index - 1]?.id] ?? null);
          }}>
            Previous
          </ActionButton>
          <ActionButton disabled={!selected} className="flex-1" onPress={handleNext}>{index === questions.length - 1 ? 'Submit' : 'Next'}</ActionButton>
        </View>
      </View>
    );
  }

  return (
    <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Prepcore</Text>
      <Text style={{ marginTop: space.xlarge, color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Choose Mock Exam</Text>

      <View style={{ marginTop: space.large, flexDirection: 'row', gap: space.medium, alignItems: 'stretch' }}>
        <View className="flex-1" style={{ minHeight: 230, padding: space.medium, borderRadius: radii.md, backgroundColor: colors.primary, ...shadow }}>
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>JAMB{'\n'}Mock</Text>
          <Text style={{ marginTop: space.large, color: colors.white, fontSize: 14, lineHeight: 21 }}>Live questions{ '\n' }Timed assessment</Text>
          <View className="flex-row items-center justify-between" style={{ marginTop: space.large }}>
            <Text style={{ color: colors.white, fontSize: 14, lineHeight: 21 }}>English{'\n'}Language</Text>
            <Ionicons name="lock-closed" size={24} color={colors.white} />
          </View>
        </View>
        <View className="flex-1" style={{ minHeight: 230, padding: space.medium, borderRadius: radii.md, backgroundColor: '#CFE0FF' }}>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>WAEC{'\n'}Mock</Text>
          <Text style={{ marginTop: space.large, color: colors.text, fontSize: 14, lineHeight: 21 }}>Live questions{ '\n' }Timed assessment</Text>
        </View>
      </View>

      <Card style={{ marginTop: space.large }}>
        {[
          ['Questions:', 'Loaded from your question bank'],
          ['Duration:', 'Timer starts when you begin'],
          ['Subjects', 'Selected from available live subjects']
        ].map(([label, value], idx) => (
          <View key={label} className={`flex-row justify-between ${idx > 0 ? 'border-t' : ''}`} style={{ borderColor: colors.line, paddingVertical: 12 }}>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{label}</Text>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{value}</Text>
          </View>
        ))}
      </Card>

      {limit && !limit.allowed ? (
        <View className="mt-6 rounded-3xl p-5" style={{ backgroundColor: colors.dangerSoft }}>
          <Text className="font-bold" style={{ color: colors.danger }}>Daily limit reached</Text>
          <Text className="mt-2" style={{ color: colors.danger }}>Free accounts can take 3 mock exams per day. Upgrade to Pro for unlimited mocks.</Text>
        </View>
      ) : null}

      <View className="flex-row items-center rounded-2xl border" style={{ marginTop: space.large * 0.75, padding: space.medium, backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}>
        <Feather name="alert-triangle" size={20} color="#92400E" />
        <Text style={{ marginLeft: space.small, color: '#92400E', fontSize: 14, lineHeight: 21 }}>Timer cannot be paused</Text>
      </View>
      <Pressable
        onPress={startExam}
        disabled={loading || plan.isLoading}
        className="items-center justify-center"
        style={{ marginTop: space.medium, height: 52, borderRadius: 14, backgroundColor: colors.primary, opacity: loading || plan.isLoading ? 0.5 : 1 }}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 24 }}>{loading ? 'Loading questions...' : 'Start Exam ->'}</Text>
      </Pressable>
    </ScreenScrollView>
  );
}
