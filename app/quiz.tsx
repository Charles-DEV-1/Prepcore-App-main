// Prepcore — Live Data & Polish
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert, ScrollView, Animated, Easing, Modal } from 'react-native';
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
import { space } from '../src/constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionContainer } from '../src/components/AnimatedMotion';
import { AnimatedAnswerCard } from '../src/components/AnimatedAnswerCard';
import { ExplanationReveal } from '../src/components/ExplanationReveal';
import { AnswerResultAnimation } from '../src/components/AnswerResultAnimation';

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
  const [explanationContentHeight, setExplanationContentHeight] = useState(0);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const feedbackY = useRef(new Animated.Value(-120)).current;
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressOpacity = useRef(new Animated.Value(1)).current;

  function showFeedback(kind: 'success' | 'error', message: string) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ kind, message });
    feedbackY.setValue(-120);
    Animated.spring(feedbackY, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: true }).start();
    feedbackTimer.current = setTimeout(() => {
      Animated.timing(feedbackY, { toValue: -120, duration: 260, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setFeedback(null);
      });
    }, 3200);
  }

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const question = questions[index];

  useEffect(() => {
    progressOpacity.setValue(0);
    const animation = Animated.timing(progressOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [index, progressOpacity]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        if (!subjectId) throw new Error('No subject selected.');
        const subject = await getSubjectById(subjectId);
        if (!subject) throw new Error('This subject is no longer available.');
        const data = await loadQuestions(subject.id, 25, subject.examType);
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
    setExplanationContentHeight(0);
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
      showFeedback('success', 'Report received. We will review this question.');
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Unable to send report. Please try again.');
    } finally {
      setReporting(false);
    }
  }

  function promptReportQuestion() {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to report questions.');
      return;
    }
    setReportMenuOpen(true);
  }

  const reportReasons: Array<{ value: Parameters<typeof submitQuestionReport>[0]; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: 'Wrong answer', icon: 'close-circle-outline' },
    { value: 'Confusing question', icon: 'help-circle-outline' },
    { value: 'Typo / error', icon: 'create-outline' },
    { value: 'Bad explanation', icon: 'chatbubble-ellipses-outline' },
    { value: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
  ];

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
    setExplanationContentHeight(0);
  }

  function handlePrevious() {
    if (index <= 0 || !question) return;
    setAnswers(current => ({ ...current, [question.id]: selected ?? current[question.id] }));
    const previousIndex = index - 1;
    const previousQuestion = questions[previousIndex];
    const previousAnswer = answers[previousQuestion.id] ?? null;
    setIndex(previousIndex);
    setSelected(previousAnswer);
    setSubmitted(Boolean(previousAnswer));
    setAiExplanation(null);
    setAiError(null);
    setExplanationContentHeight(0);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3" style={{ color: colors.muted }}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.page, paddingHorizontal: space.xl }}>
          <Text className="text-center text-lg font-bold" style={{ color: colors.ink }}>No questions are available for this subject yet.</Text>
          <ActionButton className="mt-6" onPress={() => router.push('/practice')}>Back to Practice</ActionButton>
        </View>
      </SafeAreaView>
    );
  }

  const options = Object.entries(question.options ?? {});

  if (submitted) {
    const isCorrect = selected === question.correct_answer;
    const correctText = `${question.correct_answer} ${question.options?.[question.correct_answer] ?? ''}`;
    const selectedText = selected ? `${selected} ${question.options?.[selected] ?? ''}` : '';
    const explanationText = aiExplanation ?? question.explanation ?? 'Explanation coming soon.';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View style={{ flex: 1, backgroundColor: colors.page, paddingHorizontal: space.medium, paddingTop: space.sm, paddingBottom: space.md }}>
          {feedback ? (
            <Animated.View style={{ position: 'absolute', top: 8, left: space.medium, right: space.medium, zIndex: 30, transform: [{ translateY: feedbackY }] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, padding: space.md, backgroundColor: feedback.kind === 'success' ? '#0F766E' : colors.danger, ...shadow }}>
                <Ionicons name={feedback.kind === 'success' ? 'checkmark-circle' : 'alert-circle'} size={23} color={colors.white} />
                <Text style={{ flex: 1, marginLeft: space.sm, color: colors.white, fontSize: 14, fontWeight: '700' }}>{feedback.message}</Text>
                <Pressable onPress={() => setFeedback(null)} hitSlop={8}><Ionicons name="close" size={20} color={colors.white} /></Pressable>
              </View>
            </Animated.View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.white }}>
              <Ionicons name="chevron-back" size={23} color={colors.ink} />
            </Pressable>
            <Animated.Text style={{ opacity: progressOpacity, color: colors.ink, fontSize: 15, fontWeight: '800' }}>Question {index + 1} of {questions.length}</Animated.Text>
            <CalculatorButton onPress={() => setCalculatorOpen(true)} />
          </View>
          <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

          <View style={{ marginTop: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft, padding: space.md }}>
              <AnswerResultAnimation correct />
              <View style={{ marginLeft: space.md, flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{correctText}</Text>
                <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>Correct Answer</Text>
              </View>
            </View>

            {!isCorrect ? (
              <View style={{ marginTop: space.sm, flexDirection: 'row', alignItems: 'center', borderRadius: radii.large, borderWidth: 1, borderColor: '#D46A6A', backgroundColor: colors.dangerSoft, padding: space.md }}>
                <View style={{ height: 42, width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.danger }}>
                  <AnswerResultAnimation correct={false} />
                </View>
                <View style={{ marginLeft: space.md, flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{selectedText}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>Incorrect Answer</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="robot-happy-outline" size={34} color={colors.primary} />
            <Text style={{ marginLeft: space.md, flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>Explanation</Text>
          </View>

          <View style={{ flex: explanationContentHeight > 150 ? 1 : 0, minHeight: 90, marginTop: space.md, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: space.md }}>
            <ScrollView
              style={explanationContentHeight > 150 ? { flex: 1 } : undefined}
              contentContainerStyle={{ paddingRight: space.sm }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              onContentSizeChange={(_, height) => setExplanationContentHeight(current => Math.abs(current - height) > 1 ? height : current)}
            >
              <ExplanationReveal text={explanationText} revealKey={`${question.id}-${aiExplanation ? 'ai' : 'base'}`} />
            </ScrollView>
          </View>

          <MotionContainer delay={100} distance={8} style={{ marginTop: space.md }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Want a deeper explanation?</Text>
            <Text style={{ marginTop: 3, color: colors.muted, fontSize: 13 }}>Ask AI for a more detailed breakdown.</Text>
            <View style={{ marginTop: space.sm }}>
              <ActionButton onPress={requestAiExplanation} disabled={aiLoading}>{aiLoading ? 'Generating explanation...' : 'Ask AI'}</ActionButton>
            </View>
            {aiError ? <Text style={{ color: colors.danger, fontSize: 13 }}>{aiError}</Text> : null}
          </MotionContainer>

          <View style={{ marginTop: space.sm }}>
            <ActionButton variant="outline" onPress={promptReportQuestion} disabled={reporting}>{reporting ? 'Reporting...' : 'Report this question'}</ActionButton>
          </View>

          <View style={{ marginTop: space.md, flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><ActionButton variant="outline" onPress={handlePrevious} disabled={index === 0}>← Previous</ActionButton></View>
            <View style={{ flex: 1 }}><ActionButton onPress={handleNext} disabled={saving}>{saving ? 'Saving...' : index >= questions.length - 1 ? 'Finish' : 'Next →'}</ActionButton></View>
          </View>

          <Modal visible={reportMenuOpen} transparent animationType="fade" onRequestClose={() => setReportMenuOpen(false)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.38)' }} onPress={() => setReportMenuOpen(false)}>
              <Pressable onPress={event => event.stopPropagation()} style={{ marginTop: 92, marginHorizontal: space.medium, borderRadius: radii.large, padding: space.md, backgroundColor: colors.white, ...shadow }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
                  <View>
                    <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Report this question</Text>
                    <Text style={{ marginTop: 3, color: colors.muted, fontSize: 13 }}>What should we check?</Text>
                  </View>
                  <Pressable onPress={() => setReportMenuOpen(false)} hitSlop={8}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
                </View>
                {reportReasons.map(reason => (
                  <Pressable
                    key={reason.value}
                    onPress={() => { setReportMenuOpen(false); void submitQuestionReport(reason.value); }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', borderRadius: radii.medium, paddingVertical: 13, paddingHorizontal: 10, backgroundColor: pressed ? colors.primarySoft : colors.surface })}
                  >
                    <Ionicons name={reason.icon} size={21} color={colors.primary} />
                    <Text style={{ marginLeft: 12, color: colors.text, fontSize: 15, fontWeight: '600' }}>{reason.value}</Text>
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ flex: 1, backgroundColor: colors.page, paddingHorizontal: space.medium, paddingTop: space.sm, paddingBottom: space.md }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>{selectedSubject?.label ?? ''} Practice</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalculatorButton onPress={() => setCalculatorOpen(true)} />
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primarySoft }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Q {index + 1}/{questions.length}</Text>
              </View>
            </View>
          </View>
          <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

          <Text style={{ marginTop: space.sm, color: colors.text, fontSize: 15 }}>Question {index + 1} of {questions.length}</Text>
          <View style={{ marginTop: space.xs, flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary, marginRight: space.sm, marginBottom: space.sm }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>{selectedSubject?.label ?? ''}</Text>
            </View>
            {question.year ? (
              <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6, marginBottom: space.sm }}>
                <Text style={{ color: colors.text, fontSize: 13 }}>JAMB {question.year}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: space.md }}>
          <View style={{ padding: space.md, borderRadius: radii.lg, backgroundColor: '#F8FBFF' }}>
            <Text style={{ color: colors.primary, fontSize: 16, lineHeight: 22 }}>{question.prompt}</Text>
          </View>

          <View style={{ marginTop: space.xs }}>
            {options.map(([key, value], optionIndex) => {
              const isSelected = selected === key;
              return <AnimatedAnswerCard key={`${question.id}-${key}`} letter={key} text={String(value)} isSelected={isSelected} onPress={() => setSelected(key)} index={optionIndex} animationKey={question.id} />;
            })}
          </View>
        </View>

        <View style={{ marginTop: space.sm }}>
          <ActionButton disabled={!selected} onPress={() => setSubmitted(true)}>Submit answer</ActionButton>
        </View>
      </View>
    </SafeAreaView>
  );
}
