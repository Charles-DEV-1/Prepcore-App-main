// Prepcore — Live Data & Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { useUserPlan } from '../src/hooks/useUserPlan';
import { loadQuestions, savePracticeSession, type Question } from '../src/services/practice';
import { getSubjectById, type LiveSubject } from '../src/services/subjects';
import { getAIExplanation } from '../src/services/aiExplanation';
import { reportQuestion } from '../src/services/questionReports';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { ActionButton, BrandMark } from '../src/components/PrepcoreUI';
import { CalculatorButton, CalculatorModal } from '../src/components/CalculatorModal';
import { colors, radii, shadow } from '../src/constants/theme';

export default function QuizScreen() {
  const router = useRouter();
  const { subjectId } = useLocalSearchParams<{ subjectId?: string }>();
  const { user } = useAuth();
  const plan = useUserPlan(user?.id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<LiveSubject | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const question = questions[index];

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        if (!subjectId) throw new Error('No subject selected.');
        const subject = await getSubjectById(subjectId);
        if (!subject) throw new Error('This subject is no longer available.');
        const data = await loadQuestions(subject.id, 25);
        if (mounted) { setSelectedSubject(subject); setQuestions(data); }
      } catch (err) {
        Alert.alert('Unable to load questions', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [subjectId]);

  async function finish(finalAnswers: Record<string, string>) {
    if (!user) {
      Alert.alert('Login required', 'Please sign in first.');
      return;
    }
    setSaving(true);
    try {
      const result = await savePracticeSession(user.id, questions, finalAnswers);
      router.replace(`/results/${result.sessionId}`);
    } catch (err) {
      Alert.alert('Unable to save session', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function requestAiExplanation() {
    if (!question) return;
    setAiError(null);
    setAiExplanation(null);
    setAiLoading(true);
    try {
      const aiText = await getAIExplanation({
        question: question.prompt,
        options: question.options,
        correctAnswer: question.correct_answer,
        explanation: question.explanation ?? '',
        subject: selectedSubject?.label ?? '',
        isPro: plan?.isPro ?? false
      });
      setAiExplanation(aiText);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate AI explanation.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitQuestionReport(reason: 'Wrong answer' | 'Confusing question' | 'Typo / error' | 'Bad explanation' | 'Other') {
    if (!question || !user) return;
    setReporting(true);
    try {
      await reportQuestion(user.id, question.id, null, reason);
      Alert.alert('Thank you', 'Your report has been submitted. We will review the question shortly.');
    } catch (err) {
      Alert.alert('Unable to send report', err instanceof Error ? err.message : 'Please try again later.');
    } finally {
      setReporting(false);
    }
  }

  function promptReportQuestion() {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to report questions.');
      return;
    }
    Alert.alert('Report this question', 'Choose the issue that best describes this question.', [
      { text: 'Wrong answer', onPress: () => submitQuestionReport('Wrong answer') },
      { text: 'Confusing question', onPress: () => submitQuestionReport('Confusing question') },
      { text: 'Typo / error', onPress: () => submitQuestionReport('Typo / error') },
      { text: 'Bad explanation', onPress: () => submitQuestionReport('Bad explanation') },
      { text: 'Other', onPress: () => submitQuestionReport('Other') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  }

  function handleNext() {
    if (!question || !selected) return;
    const nextAnswers = { ...answers, [question.id]: selected };
    setAnswers(nextAnswers);

    if (index >= questions.length - 1) {
      finish(nextAnswers);
      return;
    }

    setIndex(current => current + 1);
    setSelected(null);
    setSubmitted(false);
    setAiExplanation(null);
    setAiError(null);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.primary} />
        <Text className="mt-3" style={{ color: colors.muted }}>Loading questions...</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.page }}>
        <Text className="text-center text-lg font-bold" style={{ color: colors.ink }}>No questions are available for this subject yet.</Text>
        <ActionButton className="mt-6" onPress={() => router.push('/practice')}>Back to Practice</ActionButton>
      </View>
    );
  }

  const options = Object.entries(question.options ?? {});

  if (submitted) {
    const isCorrect = selected === question.correct_answer;
    const correctText = `${question.correct_answer} ${question.options?.[question.correct_answer] ?? ''}`;
    const selectedText = selected ? `${selected} ${question.options?.[selected] ?? ''}` : '';
    const explanationText = aiExplanation ?? question.explanation ?? 'Explanation coming soon.';

    return (
      <ScreenScrollView className="flex-1 bg-white px-4 pt-8" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="flex-row items-center justify-between">
          <BrandMark size={34} showName />
          <CalculatorButton onPress={() => setCalculatorOpen(true)} />
        </View>
        <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

        <View className="mt-8 space-y-4">
          <View className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: colors.success, backgroundColor: colors.successSoft }}>
            <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.success }}>
              <Ionicons name="checkmark" size={34} color={colors.white} />
            </View>
            <View className="ml-5 flex-1">
              <Text className="text-3xl font-bold" style={{ color: colors.text }}>{correctText}</Text>
              <Text className="text-xl" style={{ color: colors.text }}>Correct Answer</Text>
            </View>
          </View>

          {!isCorrect ? (
            <View className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: '#D46A6A', backgroundColor: colors.dangerSoft }}>
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.danger }}>
                <Ionicons name="close" size={34} color={colors.white} />
              </View>
              <View className="ml-5 flex-1">
                <Text className="text-3xl font-bold" style={{ color: colors.text }}>{selectedText}</Text>
                <Text className="text-xl" style={{ color: colors.text }}>Incorrect Answer</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="mt-10 flex-row items-center">
          <MaterialCommunityIcons name="robot-happy-outline" size={62} color={colors.ink} />
          <Text className="ml-5 flex-1 text-4xl font-extrabold" style={{ color: colors.text }}>Why this is correct</Text>
        </View>

        <View className="mt-7 border-l-4 pl-5" style={{ borderColor: colors.primary }}>
          <Text className="text-2xl leading-10" style={{ color: colors.text }}>
            {explanationText}
          </Text>
        </View>

        <View className="mt-7 space-y-3">
          <ActionButton onPress={requestAiExplanation} disabled={aiLoading}>{aiLoading ? 'Generating explanation...' : 'Explain with AI'}</ActionButton>
          {aiError ? <Text className="text-sm" style={{ color: colors.danger }}>{aiError}</Text> : null}
          <ActionButton variant="outline" onPress={promptReportQuestion} disabled={reporting}>{reporting ? 'Reporting...' : 'Report this question'}</ActionButton>
        </View>

        <ActionButton className="mt-8" onPress={handleNext} disabled={saving}>{saving ? 'Saving...' : index >= questions.length - 1 ? 'Finish session' : 'Next Question'}</ActionButton>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView className="flex-1 bg-white px-5 pt-8" contentContainerStyle={{ paddingBottom: 130 }}>
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-2xl font-extrabold" style={{ color: colors.text }}>{selectedSubject?.label ?? ''} Practice</Text>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <CalculatorButton onPress={() => setCalculatorOpen(true)} />
          <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.primarySoft }}>
            <Text className="font-bold" style={{ color: colors.primary }}>Q {index + 1}/{questions.length}</Text>
          </View>
        </View>
      </View>
      <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

      <Text className="mt-9 text-2xl" style={{ color: colors.text }}>Question {index + 1} of {questions.length}</Text>
      <View className="mt-5 flex-row flex-wrap gap-3">
        <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.primary }}>
          <Text className="text-lg font-bold text-white">{selectedSubject?.label ?? ''}</Text>
        </View>
        {question.year ? (
          <View className="rounded-full border px-4 py-2" style={{ borderColor: colors.line }}>
            <Text className="text-lg" style={{ color: colors.text }}>JAMB {question.year}</Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-10 text-5xl font-extrabold" style={{ color: colors.text, lineHeight: 58 }}>{question.prompt}</Text>

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

      <ActionButton disabled={!selected} className="mt-10" onPress={() => setSubmitted(true)}>Submit answer</ActionButton>
    </ScreenScrollView>
  );
}
