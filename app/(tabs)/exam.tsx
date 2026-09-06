// Prepcore — Live Data & Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { checkMockExamLimit, loadExamQuestions, submitExam } from '../../src/services/exam';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import type { Question } from '../../src/services/practice';
import { ActionButton, Card } from '../../src/components/PrepcoreUI';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { CalculatorButton, CalculatorModal } from '../../src/components/CalculatorModal';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { MotionContainer } from '../../src/components/AnimatedMotion';
import { AnimatedAnswerCard } from '../../src/components/AnimatedAnswerCard';
import { useAppFeedback } from '../../src/components/AnimatedFeedback';

type Phase = 'setup' | 'exam' | 'submitting';
const EXAM_DURATION_SECONDS = 120 * 60;

export default function MockExamScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showFeedback } = useAppFeedback();
  const plan = useUserPlan(user?.id);
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState<{ allowed: boolean; remaining: number } | null>(null);
  const [seconds, setSeconds] = useState(EXAM_DURATION_SECONDS);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [examType, setExamType] = useState<'JAMB' | 'WAEC'>('JAMB');
  const [availableSubjects, setAvailableSubjects] = useState<LiveSubject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setSubjectsLoading(true);
    getSubjectsWithQuestionCounts(examType).then(subjects => {
      if (!mounted) return;
      const withQuestions = subjects.filter(subject => subject.questionCount > 0);
      const english = withQuestions.find(subject => subject.label.toLowerCase().includes('english'));
      setAvailableSubjects(withQuestions);
      setSelectedSubjectIds(examType === 'JAMB' && english ? [english.id] : []);
    }).catch(error => {
      if (mounted) showFeedback(error instanceof Error ? error.message : 'Unable to load available subjects.', 'error', 'top');
    }).finally(() => { if (mounted) setSubjectsLoading(false); });
    return () => { mounted = false; };
  }, [examType, showFeedback]);

  function toggleSubject(subject: LiveSubject) {
    const isEnglish = subject.label.toLowerCase().includes('english');
    if (examType === 'JAMB' && isEnglish) return;
    setSelectedSubjectIds(current => current.includes(subject.id)
      ? current.filter(id => id !== subject.id)
      : [...current, subject.id]);
  }

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
      showFeedback('Please sign in before starting a mock exam.', 'warning', 'top');
      return;
    }

    setLoading(true);
    try {
      if (examType === 'JAMB' && selectedSubjectIds.length !== 4) {
        showFeedback('Choose English and three other subjects before starting.', 'warning', 'top');
        return;
      }
      if (examType === 'WAEC' && selectedSubjectIds.length === 0) {
        showFeedback('Choose at least one WAEC subject before starting.', 'warning', 'top');
        return;
      }
      const examLimit = await checkMockExamLimit(user.id, plan.isPro);
      setLimit(examLimit);
      if (!examLimit.allowed) return;

      const loaded = await loadExamQuestions(examType, selectedSubjectIds, user.id);
      if (!loaded.length) {
        showFeedback(`No ${examType} mock questions are available yet.`, 'info', 'top');
        return;
      }
      if (examType === 'JAMB' && loaded.length < 180) {
        showFeedback(`This mock needs 180 live questions, but only ${loaded.length} are available for the selected subjects.`, 'warning', 'top');
        return;
      }
      setQuestions(loaded);
      setAnswers({});
      setSkippedIds({});
      setIndex(0);
      setSelected(null);
      setActiveSubjectId(loaded[0]?.subject_id ?? selectedSubjectIds[0] ?? null);
      setSeconds(EXAM_DURATION_SECONDS);
      setPhase('exam');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to start the exam. Please try again.', 'error', 'top');
    } finally {
      setLoading(false);
    }
  }

  async function finishExam(finalAnswers: Record<string, string>) {
    if (!user || phase === 'submitting') return;
    setPhase('submitting');
    try {
      const result = await submitExam(user.id, questions, finalAnswers, examType);
      router.replace(`/results/${result.sessionId}`);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to submit the exam. Please try again.', 'error', 'top');
      setPhase('exam');
    }
  }

  function handleNext() {
    const question = questions[index];
    if (!question || !selected) return;
    const nextAnswers = { ...answers, [question.id]: selected };
    setAnswers(nextAnswers);
    setSkippedIds(current => { const next = { ...current }; delete next[question.id]; return next; });
    const subjectQuestions = questions.filter(item => item.subject_id === question.subject_id);
    const subjectPosition = subjectQuestions.findIndex(item => item.id === question.id);
    const nextInSubject = subjectQuestions[subjectPosition + 1];
    if (nextInSubject) {
      setIndex(questions.findIndex(item => item.id === nextInSubject.id));
      setSelected(nextAnswers[nextInSubject.id] ?? null);
      return;
    }
    const currentSubjectPosition = selectedSubjectIds.indexOf(question.subject_id ?? '');
    const nextSubjectId = selectedSubjectIds.slice(currentSubjectPosition + 1).find(id => questions.some(item => item.subject_id === id));
    if (nextSubjectId) {
      const nextSubjectQuestion = questions.find(item => item.subject_id === nextSubjectId);
      setActiveSubjectId(nextSubjectId);
      setIndex(questions.findIndex(item => item.id === nextSubjectQuestion?.id));
      setSelected(nextSubjectQuestion ? nextAnswers[nextSubjectQuestion.id] ?? null : null);
      return;
    }
    finishExam(nextAnswers);
  }

  function handlePrevious() {
    const question = questions[index];
    if (!question) return;
    const subjectQuestions = questions.filter(item => item.subject_id === question.subject_id);
    const subjectPosition = subjectQuestions.findIndex(item => item.id === question.id);
    const previousInSubject = subjectQuestions[subjectPosition - 1];
    if (previousInSubject) {
      setIndex(questions.findIndex(item => item.id === previousInSubject.id));
      setSelected(answers[previousInSubject.id] ?? null);
      return;
    }
    const currentSubjectPosition = selectedSubjectIds.indexOf(question.subject_id ?? '');
    const previousSubjectId = [...selectedSubjectIds.slice(0, currentSubjectPosition)].reverse().find(id => questions.some(item => item.subject_id === id));
    if (previousSubjectId) {
      const previousSubjectQuestions = questions.filter(item => item.subject_id === previousSubjectId);
      const previousQuestion = previousSubjectQuestions[previousSubjectQuestions.length - 1];
      setActiveSubjectId(previousSubjectId);
      setIndex(questions.findIndex(item => item.id === previousQuestion?.id));
      setSelected(previousQuestion ? answers[previousQuestion.id] ?? null : null);
    }
  }

  function skipQuestion() {
    const question = questions[index];
    if (!question) return;
    setSkippedIds(current => ({ ...current, [question.id]: true }));
    setSelected(null);
    handleNextWithQuestion(question);
  }

  function handleNextWithQuestion(question: Question) {
    const subjectQuestions = questions.filter(item => item.subject_id === question.subject_id);
    const subjectPosition = subjectQuestions.findIndex(item => item.id === question.id);
    const nextInSubject = subjectQuestions[subjectPosition + 1];
    if (nextInSubject) {
      setIndex(questions.findIndex(item => item.id === nextInSubject.id));
      setSelected(answers[nextInSubject.id] ?? null);
      return;
    }
    const currentSubjectPosition = selectedSubjectIds.indexOf(question.subject_id ?? '');
    const nextSubjectId = selectedSubjectIds.slice(currentSubjectPosition + 1).find(id => questions.some(item => item.subject_id === id));
    if (nextSubjectId) {
      const nextQuestion = questions.find(item => item.subject_id === nextSubjectId);
      setActiveSubjectId(nextSubjectId);
      setIndex(questions.findIndex(item => item.id === nextQuestion?.id));
      setSelected(nextQuestion ? answers[nextQuestion.id] ?? null : null);
      return;
    }
    finishExam(answers);
  }

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const chosenSubjects = availableSubjects.filter(subject => selectedSubjectIds.includes(subject.id));

  if (phase === 'submitting') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3" style={{ color: colors.muted }}>Calculating your result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'exam') {
    const question = questions[index];
    const options = Object.entries(question?.options ?? {});
    const examSubjects = selectedSubjectIds.filter(subjectId => questions.some(item => item.subject_id === subjectId));
    const answeredCount = Object.keys(answers).length;
    const skippedCount = Object.keys(skippedIds).length;
    const remainingCount = Math.max(0, questions.length - answeredCount - skippedCount);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View style={{ flex: 1, backgroundColor: colors.page }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.softLine, paddingHorizontal: space.medium, paddingTop: space.md, paddingBottom: space.md, backgroundColor: colors.surface }}>
            <Text style={{ flex: 1, color: colors.ink, fontSize: 18, fontWeight: '700' }}>{examType} Mock Exam</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalculatorButton onPress={() => setCalculatorOpen(true)} />
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.dangerSoft }}>
                <Text style={{ color: '#B42318', fontSize: 14, fontWeight: '700' }}>{minutes}:{secs}</Text>
              </View>
            </View>
          </View>
          <CalculatorModal visible={calculatorOpen} onClose={() => setCalculatorOpen(false)} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.medium, paddingTop: space.sm, paddingBottom: space.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: 2 }}>
              {examSubjects.map(subjectId => {
                const subject = availableSubjects.find(item => item.id === subjectId);
                const active = question?.subject_id === subjectId;
                return <Pressable key={subjectId} onPress={() => {
                  const target = questions.find(item => item.subject_id === subjectId && !answers[item.id] && !skippedIds[item.id]) ?? questions.find(item => item.subject_id === subjectId);
                  setActiveSubjectId(subjectId);
                  setIndex(questions.findIndex(item => item.id === target?.id));
                  setSelected(target ? answers[target.id] ?? null : null);
                }} style={{ borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: active ? colors.primary : colors.primarySoft }}>
                  <Text style={{ color: active ? colors.white : colors.primary, fontSize: 12, fontWeight: '800' }}>{subject?.label ?? 'Subject'}</Text>
                </Pressable>;
              })}
            </ScrollView>
            <View style={{ marginTop: space.sm, flexDirection: 'row', justifyContent: 'space-between', borderRadius: radii.medium, paddingHorizontal: space.md, paddingVertical: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine }}>
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '800' }}>Answered {answeredCount}</Text>
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '800' }}>Remaining {remainingCount}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800' }}>Skipped {skippedCount}</Text>
            </View>
            <Text style={{ marginTop: space.sm, color: colors.text, fontSize: 15, fontWeight: '700' }}>Question {index + 1} of {questions.length}</Text>
            <View style={{ marginTop: space.xs, flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary, marginRight: space.sm, marginBottom: space.sm }}>
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>{question?.subject_label ?? ''}</Text>
              </View>
              <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6, marginBottom: space.sm }}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{[question?.year, question?.topic].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>

            <View style={{ marginTop: space.sm, padding: space.md, borderRadius: radii.lg, backgroundColor: '#F8FBFF' }}>
              <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>{question?.prompt}</Text>
            </View>

            <View style={{ marginTop: space.sm }}>
              {options.map(([key, value], optionIndex) => {
                const isSelected = selected === key;
                return <AnimatedAnswerCard key={`${question?.id}-${key}`} letter={key} text={String(value)} isSelected={isSelected} onPress={() => { setSelected(key); if (question?.id) setSkippedIds(current => { const next = { ...current }; delete next[question.id]; return next; }); }} index={optionIndex} animationKey={question?.id ?? index} />;
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 72, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.softLine, paddingHorizontal: space.medium, paddingVertical: space.sm }}>
            <Pressable
              onPress={skipQuestion}
              style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}
            >
              <Ionicons name="play-skip-forward-outline" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}><ActionButton variant="outline" disabled={index === 0} onPress={handlePrevious}>Previous</ActionButton></View>
            <View style={{ flex: 1 }}><ActionButton disabled={!selected} onPress={handleNext}>{index === questions.length - 1 ? 'Submit' : 'Next'}</ActionButton></View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScreenScrollView className="flex-1 pt-2" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Prepcore</Text>
      <Text style={{ marginTop: space.md, color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>Choose Mock Exam</Text>

      <View style={{ marginTop: space.md, flexDirection: 'row', gap: space.sm }}>
        {(['JAMB', 'WAEC'] as const).map(type => (
          <Pressable key={type} onPress={() => setExamType(type)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radii.medium, backgroundColor: examType === type ? colors.primary : colors.surface, borderWidth: 1, borderColor: examType === type ? colors.primary : colors.line }}>
            <Text style={{ color: examType === type ? colors.white : colors.text, fontWeight: '800' }}>{type} Mock</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginTop: space.md }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{examType === 'JAMB' ? 'Choose 3 subjects' : 'Choose your subjects'}</Text>
        <Text style={{ marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 19 }}>{examType === 'JAMB' ? 'English is compulsory. Pick three other subjects.' : 'Select from subjects available in your live question bank.'}</Text>
        {subjectsLoading ? <ActivityIndicator style={{ marginTop: space.md }} color={colors.primary} /> : null}
        <View style={{ marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {availableSubjects.map(subject => {
            const selectedSubject = selectedSubjectIds.includes(subject.id);
            const english = subject.label.toLowerCase().includes('english');
            const locked = examType === 'JAMB' && english;
            return (
              <Pressable key={subject.id} onPress={() => toggleSubject(subject)} style={{ width: '48%', minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: radii.medium, borderWidth: selectedSubject ? 2 : 1, borderColor: selectedSubject ? colors.primary : colors.line, backgroundColor: selectedSubject ? colors.primarySoft : colors.surface, opacity: locked ? 0.9 : 1 }}>
                <Ionicons name={selectedSubject ? 'checkmark-circle' : locked ? 'lock-closed' : 'ellipse-outline'} size={20} color={selectedSubject ? colors.primary : colors.muted} />
                <Text numberOfLines={1} style={{ flex: 1, marginLeft: 7, color: colors.text, fontSize: 13, fontWeight: '700' }}>{subject.label}{locked ? ' · compulsory' : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ marginTop: space.md, flexDirection: 'row', gap: space.sm }}>
        {[
          { label: 'Questions', value: '180', icon: 'help-circle-outline' as const },
          { label: 'English', value: '60', icon: 'book-outline' as const },
          { label: 'Time', value: '120m', icon: 'time-outline' as const },
        ].map(stat => (
          <View key={stat.label} style={{ flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', borderRadius: radii.medium, paddingHorizontal: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.softLine }}>
            <Ionicons name={stat.icon} size={18} color={colors.primary} />
            <Text style={{ marginTop: 4, color: colors.ink, fontSize: 16, fontWeight: '800' }}>{stat.value}</Text>
            <Text style={{ marginTop: 1, color: colors.muted, fontSize: 11, fontWeight: '700' }}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={{ marginTop: space.sm, color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {chosenSubjects.length ? chosenSubjects.map(subject => subject.label).join(' · ') : 'Select subjects above'}
      </Text>

      {limit && !limit.allowed ? (
        <View className="mt-4 rounded-3xl p-5" style={{ backgroundColor: colors.dangerSoft }}>
          <Text className="font-bold" style={{ color: colors.danger }}>Daily limit reached</Text>
          <Text className="mt-2" style={{ color: colors.danger }}>Free accounts can take 3 mock exams per day. Upgrade to Pro for unlimited mocks.</Text>
        </View>
      ) : null}

      <View className="flex-row items-center rounded-2xl border" style={{ marginTop: space.md, padding: space.medium, backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}>
        <Feather name="alert-triangle" size={20} color="#92400E" />
        <Text style={{ marginLeft: space.small, color: '#92400E', fontSize: 14, lineHeight: 21 }}>Timer cannot be paused</Text>
      </View>
      <Pressable
        onPress={startExam}
        disabled={loading || plan.isLoading || subjectsLoading}
        className="items-center justify-center"
        style={{ marginTop: space.sm, height: 52, borderRadius: 14, backgroundColor: colors.primary, opacity: loading || plan.isLoading || subjectsLoading ? 0.5 : 1 }}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 24 }}>{loading ? 'Loading questions...' : 'Start Exam ->'}</Text>
      </Pressable>
    </ScreenScrollView>
    </SafeAreaView>
  );
}
