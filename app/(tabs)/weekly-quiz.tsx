import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Card } from '../../src/components/PrepcoreUI';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { useAuth } from '../../src/hooks/useAuth';
import { checkAlreadyCompleted, getCurrentQuiz, getWeeklyQuizHistory, loadQuizQuestions, submitQuiz } from '../../src/services/weeklyQuiz';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { EmptyState } from '../../src/components/EmptyState';

type Phase = 'loading' | 'intro' | 'quiz' | 'done' | 'no_quiz';

export default function WeeklyQuizScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scoreText, setScoreText] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setPhase('loading');
    setError(null);
    const quiz = await getCurrentQuiz();

    if (!quiz) {
      setPhase('no_quiz');
      return;
    }

    try {
      const quizHistory = await getWeeklyQuizHistory(user.id);
      setHistory(quizHistory);
    } catch {
      // ignore history errors
    }

    setQuizId(quiz.id);
    const existing = await checkAlreadyCompleted(quiz.id, user.id);
    if (existing) {
      setScoreText(`${existing.score}/${existing.total_questions}`);
      setPhase('done');
      return;
    }

    const loadedQuestions = await loadQuizQuestions(quiz.question_ids ?? []);
    setQuestions(loadedQuestions);
    setPhase('intro');
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!user) return;
      await load();
      if (!mounted) return;
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleNext() {
    if (!user || !quizId || !selected) return;
    const question = questions[index];
    const nextAnswers = { ...answers, [question.id]: selected };
    setAnswers(nextAnswers);

    if (index < questions.length - 1) {
      setIndex(current => current + 1);
      setSelected(null);
      return;
    }

    try {
      const result = await submitQuiz(quizId, user.id, questions, nextAnswers);
      setScoreText(`${result.score}/${questions.length}`);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit quiz.');
      Alert.alert('Unable to submit quiz', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (phase === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'no_quiz') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
          <EmptyState
            icon="calendar-outline"
            title="No quiz this week yet"
            description="A fresh weekly challenge is usually released each week. Check back soon or revisit your leaderboard progress in the meantime."
            actionLabel="Retry"
            onAction={() => {
              setPhase('loading');
              setError(null);
            }}
          />
        </ScreenScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ borderRadius: 999, backgroundColor: '#FEF3C7', padding: space.lg }}>
            <FontAwesome5 name="trophy" size={24} color="#b45309" />
          </View>
          <Text style={{ marginTop: space.lg, color: colors.ink, fontSize: 22, fontWeight: '700' }}>Weekly Quiz Complete</Text>
          <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Your score: {scoreText}</Text>
        </View>
        <Card style={{ marginTop: space.xl }}>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Recent history</Text>
          {history.length ? history.slice(0,3).map(entry => (
            <View key={`${entry.quiz_id}-${entry.completed_at}`} style={{ marginTop: space.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textSecondary }}>{entry.completed_at ? new Date(entry.completed_at).toLocaleDateString() : 'Completed'}</Text>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{entry.score}/{entry.total_questions}</Text>
            </View>
          )) : <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>No history yet.</Text>}
        </Card>
        {error ? <Text style={{ marginTop: space.md, color: colors.danger }}>{error}</Text> : null}
        <ActionButton className="mt-8" onPress={() => router.push('/leaderboard')}>View Leaderboard</ActionButton>
      </ScreenScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'quiz') {
    const question = questions[index];
    const options = Object.entries(question?.options ?? {});
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Question {index + 1} of {questions.length}</Text>
        <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 18, fontWeight: '700', lineHeight: 26 }}>{question?.prompt}</Text>
        <View style={{ marginTop: space.lg }}>
          {options.map(([key, value]) => (
            <Pressable key={key} onPress={() => setSelected(key)} style={{ marginBottom: space.md, borderRadius: radii.large, borderWidth: 1, borderColor: selected === key ? colors.primary : colors.border, backgroundColor: selected === key ? colors.primarySoft : colors.surface, padding: space.lg }}>
              <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{key}. {String(value)}</Text>
            </Pressable>
          ))}
        </View>
        <ActionButton disabled={!selected} className="mt-8" onPress={handleNext}>{index === questions.length - 1 ? 'Finish quiz' : 'Next question'}</ActionButton>
      </ScreenScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderRadius: 999, backgroundColor: '#FEF3C7', padding: space.lg }}>
          <FontAwesome5 name="trophy" size={24} color="#b45309" />
        </View>
        <Text style={{ marginTop: space.lg, color: colors.ink, fontSize: 22, fontWeight: '700' }}>This week{"'"}s challenge</Text>
        <Text style={{ marginTop: space.sm, color: colors.textSecondary, textAlign: 'center' }}>Mixed subjects. One attempt. Leaderboard points.</Text>
      </View>

      <Card style={{ marginTop: space.xl }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{questions.length} questions loaded</Text>
        <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Answer carefully. Your score will be saved to the shared web and mobile leaderboard.</Text>
      </Card>

      <ActionButton className="mt-8" onPress={() => setPhase('quiz')}>Start Quiz</ActionButton>
      <ActionButton variant="outline" className="mt-3" onPress={() => router.push('/leaderboard')}>View Leaderboard</ActionButton>
    </ScreenScrollView>
    </SafeAreaView>
  );
}
