// Prepcore — Live Data & Polish
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { examTracks } from '../../src/constants/prepcore';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { completeOnboarding as saveOnboarding } from '../../src/services/onboarding';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, StepDots, SubjectIcon } from '../../src/components/PrepcoreUI';
import { colors, radii } from '../../src/constants/theme';

const steps = ['Exam', 'Subjects', 'Goal'];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState<'JAMB' | 'WAEC' | 'NECO'>('JAMB');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<LiveSubject[]>([]);
  const [targetScore, setTargetScore] = useState(280);
  const [examDate, setExamDate] = useState('2026-06-20');
  const [referralCode, setReferralCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadReferral() {
      try {
        const savedReferral = await AsyncStorage.getItem('prepcore_referral_code');
        if (mounted && savedReferral) setReferralCode(savedReferral);
      } catch {
        // ignore
      }
    }

    loadReferral();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getSubjectsWithQuestionCounts(examType).then(data => { if (active) setAvailableSubjects(data); }).catch(() => { if (active) setAvailableSubjects([]); });
    return () => { active = false; };
  }, [examType]);

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return subjects.length > 0;
    return targetScore >= 100 && examDate.length > 0;
  }, [examDate, step, subjects, targetScore]);

  const toggleSubject = (subject: string) => {
    setSubjects(current => (current.includes(subject) ? current.filter(item => item !== subject) : [...current, subject]));
  };

  async function completeOnboarding() {
    if (!user) {
      Alert.alert('Login required', 'Please sign in first.');
      return;
    }

    setSaving(true);
    try {
      await saveOnboarding({ examType, subjects, targetScore, examDate, referralCode });
      await AsyncStorage.removeItem('prepcore_referral_code');
    } catch (err) {
      setSaving(false);
      Alert.alert('Unable to save onboarding', err instanceof Error ? err.message : 'Please try again.');
      return;
    }

    setSaving(false);
    router.replace('/(tabs)/dashboard');
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenScrollView contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 130 }}>
        <StepDots total={steps.length} active={step} />

        {step === 0 ? (
          <View className="mt-14">
            <Text className="text-center text-5xl font-extrabold" style={{ color: colors.ink, lineHeight: 58 }}>Which exam are you preparing for?</Text>
            <View className="mt-16 space-y-5">
              {examTracks.map(option => {
                const selected = examType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setExamType(option)}
                    className="flex-row items-center justify-center"
                    style={{
                      minHeight: 92,
                      borderRadius: radii.lg,
                      borderWidth: selected ? 2 : 1.5,
                      borderColor: selected ? colors.primary : '#8A9098',
                      backgroundColor: selected ? colors.primarySoft : colors.white
                    }}
                  >
                    <Ionicons name="school" size={28} color={colors.primary} />
                    <Text className="ml-4 text-2xl font-extrabold" style={{ color: colors.text }}>{option} Only</Text>
                    {selected ? <Ionicons style={{ marginLeft: 12 }} name="checkmark-circle" size={30} color={colors.success} /> : null}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setExamType('JAMB')}
                className="flex-row items-center justify-center"
                style={{ minHeight: 92, borderRadius: radii.lg, borderWidth: 1.5, borderColor: '#8A9098', backgroundColor: colors.white }}
              >
                <Ionicons name="school" size={28} color={colors.primary} />
                <Text className="ml-4 text-2xl font-extrabold" style={{ color: colors.text }}>Both JAMB and WAEC</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View className="mt-14">
            <Text className="text-center text-5xl font-extrabold" style={{ color: colors.ink }}>Pick your subjects</Text>
            <Text className="mt-5 text-center text-3xl leading-10" style={{ color: '#555A63' }}>Select the subjects you{"'"}re preparing for</Text>
            <View className="mt-12 flex-row flex-wrap justify-between">
              {availableSubjects.slice(0, 8).map(subject => {
                const selected = subjects.includes(subject.label);
                return (
                  <Pressable
                    key={subject.id}
                    onPress={() => toggleSubject(subject.label)}
                    className="mb-5 flex-row items-center p-4"
                    style={{
                      width: '47%',
                      minHeight: 92,
                      borderRadius: radii.lg,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : '#8A9098',
                      backgroundColor: selected ? colors.primary : colors.white
                    }}
                  >
                    <SubjectIcon subject={subject.label} selected={selected} />
                    <Text className="ml-3 flex-1 text-xl font-extrabold leading-6" style={{ color: selected ? colors.white : colors.text }}>{subject.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={26} color={colors.white} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View className="mt-14">
            <Text className="text-center text-5xl font-extrabold" style={{ color: colors.ink }}>Set your goal</Text>
            <Text className="mt-5 text-center text-2xl leading-8" style={{ color: '#555A63' }}>A clear target helps Prepcore guide your practice.</Text>
            <View className="mt-12 space-y-5">
              <View className="p-5" style={{ borderRadius: 22, backgroundColor: colors.primarySoft }}>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="bullseye-arrow" size={30} color={colors.primary} />
                  <Text className="ml-3 text-xl font-bold" style={{ color: colors.ink }}>Target score</Text>
                </View>
                <TextInput
                  value={String(targetScore)}
                  keyboardType="number-pad"
                  onChangeText={value => setTargetScore(Number(value) || 100)}
                  className="mt-5 rounded-2xl bg-white px-5 py-4 text-2xl font-bold"
                  style={{ color: colors.text }}
                />
              </View>
              <TextInput
                value={examDate}
                onChangeText={setExamDate}
                placeholder="Exam date: YYYY-MM-DD"
                placeholderTextColor="#8B929E"
                className="rounded-2xl border bg-white px-5 py-4 text-xl"
                style={{ borderColor: colors.line, color: colors.text }}
              />
              <TextInput
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                placeholder="Lesson center code optional"
                placeholderTextColor="#8B929E"
                className="rounded-2xl border bg-white px-5 py-4 text-xl"
                style={{ borderColor: colors.line, color: colors.text }}
              />
            </View>
          </View>
        ) : null}
      </ScreenScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-8 pt-4">
        <View className="flex-row gap-3">
          {step > 0 ? (
            <ActionButton variant="outline" className="flex-1" onPress={() => setStep(Math.max(0, step - 1))}>Back</ActionButton>
          ) : null}
          <ActionButton
            className="flex-1"
            disabled={!canContinue || saving}
            onPress={() => {
              if (step === steps.length - 1) completeOnboarding();
              else setStep(step + 1);
            }}
          >
            {step === steps.length - 1 ? (saving ? 'Saving...' : 'Continue') : 'Continue'}
          </ActionButton>
        </View>
      </View>
    </View>
  );
}
