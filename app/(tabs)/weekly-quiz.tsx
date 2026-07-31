import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { checkAlreadyCompleted, getCurrentQuiz, loadQuizQuestions, submitQuiz } from '../../src/services/weeklyQuiz';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';

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

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user) return;
      const quiz = await getCurrentQuiz();
      if (!mounted) return;

      if (!quiz) {
        setPhase('no_quiz');
        return;
      }

      setQuizId(quiz.id);
      const existing = await checkAlreadyCompleted(quiz.id, user.id);
      if (existing) {
        setScoreText(`${existing.score}/${existing.total_questions}`);
        setPhase('done');
        return;
      }

      const loadedQuestions = await loadQuizQuestions(quiz.question_ids ?? []);
      if (!mounted) return;
      setQuestions(loadedQuestions);
      setPhase('intro');
    }

    load();

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
      Alert.alert('Unable to submit quiz', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (phase === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator color="#185FA5" />
      </View>
    );
  }

  if (phase === 'no_quiz') {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <Text className="text-center text-xl font-bold text-[#0f172a]">No quiz this week yet</Text>
        <Text className="mt-2 text-center text-[#64748b]">A new quiz drops every Monday.</Text>
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
        <View className="items-center">
          <View className="rounded-full bg-[#FEF3C7] p-4">
            <FontAwesome5 name="trophy" size={24} color="#b45309" />
          </View>
          <Text className="mt-4 text-2xl font-bold text-[#0f172a]">Weekly Quiz Complete</Text>
          <Text className="mt-2 text-sm text-[#64748b]">Your score: {scoreText}</Text>
        </View>
        <Pressable onPress={() => router.push('/leaderboard')} className="mt-8 rounded-3xl bg-[#185FA5] py-4 items-center">
          <Text className="text-white text-base font-semibold">View Leaderboard</Text>
        </Pressable>
      </ScreenScrollView>
    );
  }

  if (phase === 'quiz') {
    const question = questions[index];
    const options = Object.entries(question?.options ?? {});
    return (
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
        <Text className="text-sm text-[#64748b]">Question {index + 1} of {questions.length}</Text>
        <Text className="mt-5 text-lg font-semibold leading-7 text-[#0f172a]">{question?.prompt}</Text>
        <View className="mt-6 space-y-3">
          {options.map(([key, value]) => (
            <Pressable key={key} onPress={() => setSelected(key)} className={`rounded-2xl border p-4 ${selected === key ? 'border-[#185FA5] bg-[#EAF3FF]' : 'border-[#CBD5E1] bg-white'}`}>
              <Text className="font-semibold text-[#0f172a]">{key}. {String(value)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable disabled={!selected} onPress={handleNext} className={`mt-8 rounded-2xl py-4 items-center ${selected ? 'bg-[#185FA5]' : 'bg-[#CBD5E1]'}`}>
          <Text className="text-white font-semibold">{index === questions.length - 1 ? 'Finish quiz' : 'Next question'}</Text>
        </Pressable>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
      <View className="items-center">
        <View className="rounded-full bg-[#FEF3C7] p-4">
          <FontAwesome5 name="trophy" size={24} color="#b45309" />
        </View>
        <Text className="mt-4 text-2xl font-bold text-[#0f172a]">This week{"'"}s challenge</Text>
        <Text className="mt-2 text-sm text-[#64748b]">Mixed subjects. One attempt. Leaderboard points.</Text>
      </View>

      <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <Text className="font-semibold text-[#0f172a]">{questions.length} questions loaded</Text>
        <Text className="mt-2 text-[#64748b]">Answer carefully. Your score will be saved to the shared web and mobile leaderboard.</Text>
      </View>

      <Pressable onPress={() => setPhase('quiz')} className="mt-8 rounded-3xl bg-[#185FA5] py-4 items-center">
        <Text className="text-white text-base font-semibold">Start Quiz</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/leaderboard')} className="mt-3 rounded-3xl border border-[#CBD5E1] bg-white py-4 items-center">
        <Text className="text-[#185FA5] text-base font-semibold">View Leaderboard</Text>
      </Pressable>
    </ScreenScrollView>
  );
}
