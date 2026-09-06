// Prepcore — Live Data & Polish
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { space } from '../../src/constants/spacing';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: 130 }}>
          <StepDots total={steps.length} active={step} />

          {step === 0 ? (
            <View style={{ marginTop: space.xxl }}>
              <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 32 }}>Which exam are you preparing for?</Text>
              <View style={{ marginTop: space.xl }}>
              {examTracks.map(option => {
                const selected = examType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setExamType(option)}
                    style={{
                      minHeight: 76,
                      borderRadius: radii.large,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: space.lg,
                      marginBottom: space.md
                    }}
                  >
                    <Ionicons name="school" size={24} color={colors.primary} />
                    <Text style={{ marginLeft: space.md, color: colors.text, fontSize: 16, fontWeight: '700' }}>{option} Only</Text>
                    {selected ? <Ionicons style={{ marginLeft: space.md }} name="checkmark-circle" size={24} color={colors.success} /> : null}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setExamType('JAMB')}
                style={{ minHeight: 76, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg }}
              >
                <Ionicons name="school" size={24} color={colors.primary} />
                <Text style={{ marginLeft: space.md, color: colors.text, fontSize: 16, fontWeight: '700' }}>Both JAMB and WAEC</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ marginTop: space.xxl }}>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>Pick your subjects</Text>
            <Text style={{ marginTop: space.md, color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Select the subjects you{"'"}re preparing for</Text>
            <View style={{ marginTop: space.xl, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {availableSubjects.slice(0, 8).map(subject => {
                const selected = subjects.includes(subject.label);
                return (
                  <Pressable
                    key={subject.id}
                    onPress={() => toggleSubject(subject.label)}
                    style={{
                      width: '47%',
                      minHeight: 88,
                      borderRadius: radii.large,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: space.md,
                      marginBottom: space.md
                    }}
                  >
                    <SubjectIcon subject={subject.label} selected={selected} />
                    <Text style={{ marginLeft: space.sm, flex: 1, color: selected ? colors.white : colors.text, fontSize: 14, fontWeight: '700' }}>{subject.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.white} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ marginTop: space.xxl }}>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>Set your goal</Text>
            <Text style={{ marginTop: space.md, color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>A clear target helps Prepcore guide your practice.</Text>
            <View style={{ marginTop: space.xl }}>
              <View style={{ padding: space.lg, borderRadius: radii.large, backgroundColor: colors.primarySoft }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="bullseye-arrow" size={24} color={colors.primary} />
                  <Text style={{ marginLeft: space.md, color: colors.ink, fontSize: 16, fontWeight: '700' }}>Target score</Text>
                </View>
                <TextInput
                  value={String(targetScore)}
                  keyboardType="number-pad"
                  onChangeText={value => setTargetScore(Number(value) || 100)}
                  style={{ marginTop: space.md, minHeight: 48, borderRadius: radii.large, paddingHorizontal: space.lg, color: colors.text, fontSize: 16, backgroundColor: colors.surface }}
                />
              </View>
              <TextInput
                value={examDate}
                onChangeText={setExamDate}
                placeholder="Exam date: YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={{ marginTop: space.md, minHeight: 48, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surface }}
              />
              <TextInput
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                placeholder="Lesson center code optional"
                placeholderTextColor={colors.muted}
                style={{ marginTop: space.md, minHeight: 48, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surface }}
              />
            </View>
          </View>
        ) : null}
      </ScreenScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
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
    </SafeAreaView>
  );
}
