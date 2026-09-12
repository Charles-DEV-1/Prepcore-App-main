// Prepcore — Live Data & Polish
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { examTracks } from '../../src/constants/prepcore';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { savePendingOnboarding } from '../../src/services/onboarding';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { ActionButton, StepDots, SubjectIcon } from '../../src/components/PrepcoreUI';
import { colors, radii } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { OnboardingBrandHero } from '../../src/components/OnboardingBrandHero';
import { MotionContainer, MotionPressable } from '../../src/components/AnimatedMotion';

const steps = ['Exam', 'Subjects', 'Goal', 'Date'];
const examDateOptions = [
  { value: '2026-03-15', label: 'March 2026' },
  { value: '2026-06-20', label: 'June 2026' },
  { value: '2026-08-15', label: 'August 2026' },
  { value: '2027-03-15', label: 'March 2027' },
  { value: '2027-06-20', label: 'June 2027' }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [examType, setExamType] = useState<'JAMB' | 'WAEC' | 'NECO'>('JAMB');
  const [examGoals, setExamGoals] = useState<string[]>(['JAMB']);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<LiveSubject[]>([]);
  const [targetScore, setTargetScore] = useState(280);
  const [examDate, setExamDate] = useState('2026-06-20');
  const [referralCode, setReferralCode] = useState('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

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
    if (step === 0) return fullName.trim().length >= 2;
    if (step === 1) return subjects.length > 0;
    return step === 2 ? targetScore >= 100 : examDate.length > 0;
  }, [examDate, fullName, step, subjects, targetScore]);

  const toggleSubject = (subject: string) => {
    setSubjects(current => (current.includes(subject) ? current.filter(item => item !== subject) : [...current, subject]));
  };

  async function completeOnboarding() {
    setSaving(true);
    try {
      const values = { fullName, examType, examGoals, subjects, targetScore, examDate, referralCode };
      await savePendingOnboarding(values);
      await AsyncStorage.removeItem('prepcore_referral_code');
    } catch (err) {
      setSaving(false);
      Alert.alert('Unable to save onboarding', err instanceof Error ? err.message : 'Please try again.');
      return;
    }

    setSaving(false);
    router.replace('/(auth)/register');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.xxl }}>
          <OnboardingBrandHero step={step} />
          <StepDots total={steps.length} active={step} />

          {step === 0 ? (
            <View style={{ marginTop: space.xxl }}>
              <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 32 }}>Which exam are you preparing for?</Text>
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={colors.muted} autoCapitalize="words" style={{ marginTop: space.lg, minHeight: 50, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: space.lg, color: colors.text }} />
              <View style={{ marginTop: space.xl }}>
              {examTracks.map(option => {
                const selected = examType === option;
                return (
                  <MotionPressable
                    key={option}
                    onPress={() => { setExamType(option); setExamGoals([option]); }}
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
                  </MotionPressable>
                );
              })}
              <MotionPressable
                onPress={() => { setExamType('JAMB'); setExamGoals(['JAMB', 'WAEC']); }}
                style={{ minHeight: 76, borderRadius: radii.large, borderWidth: examGoals.length === 2 ? 2 : 1, borderColor: examGoals.length === 2 ? colors.primary : colors.border, backgroundColor: examGoals.length === 2 ? colors.primarySoft : colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg }}
              >
                <Ionicons name="school" size={24} color={colors.primary} />
                <Text style={{ marginLeft: space.md, color: colors.text, fontSize: 16, fontWeight: '700' }}>Both JAMB and WAEC</Text>
              </MotionPressable>
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
                <View style={{ marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {[100, 180, 240, 280, 320, 360, 400].map(value => <MotionPressable key={value} onPress={() => setTargetScore(value)} style={{ borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: targetScore === value ? colors.primary : colors.surface, borderWidth: 1, borderColor: targetScore === value ? colors.primary : colors.border }}><Text style={{ color: targetScore === value ? colors.white : colors.text, fontWeight: '700' }}>{value}</Text></MotionPressable>)}
                </View>
              </View>
              <TextInput value={university} onChangeText={setUniversity} placeholder="Target university (optional)"
                placeholderTextColor={colors.muted}
                style={{ marginTop: space.md, minHeight: 48, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surface }}
              />
              <TextInput value={course} onChangeText={setCourse} placeholder="Target course (optional)"
                placeholderTextColor={colors.muted}
                style={{ marginTop: space.md, minHeight: 48, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surface }}
              />
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <MotionContainer key="date-step" delay={80} distance={18} style={{ marginTop: space.xxl }}>
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>When is your exam?</Text>
            <Text style={{ marginTop: space.md, color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>Pick a month and we will help you keep the goal in view.</Text>
            <Pressable onPress={() => setDateMenuOpen(true)} style={{ marginTop: space.xl, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.large, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface, paddingHorizontal: space.lg }}>
              <View>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>EXAM MONTH</Text>
                <Text style={{ marginTop: 3, color: colors.ink, fontSize: 16, fontWeight: '800' }}>{examDateOptions.find(option => option.value === examDate)?.label ?? examDate}</Text>
              </View>
              <Ionicons name="chevron-down" size={22} color={colors.primary} />
            </Pressable>
            <Modal visible={dateMenuOpen} transparent animationType="fade" onRequestClose={() => setDateMenuOpen(false)}>
              <Pressable onPress={() => setDateMenuOpen(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.38)' }}>
                <Pressable onPress={event => event.stopPropagation()} style={{ maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.xl, backgroundColor: colors.surface }}>
                  <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>Choose your exam month</Text>
                  <Text style={{ marginTop: 5, color: colors.textSecondary }}>You can update this later in your exam goals.</Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: space.lg }}>
                    {examDateOptions.map(option => <Pressable key={option.value} onPress={() => { setExamDate(option.value); setDateMenuOpen(false); }} style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.softLine, paddingVertical: space.md }}><Text style={{ color: option.value === examDate ? colors.primary : colors.text, fontSize: 16, fontWeight: '700' }}>{option.label}</Text>{option.value === examDate ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}</Pressable>)}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
            <TextInput value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" placeholder="Lesson center code optional" placeholderTextColor={colors.muted} style={{ marginTop: space.lg, minHeight: 48, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, color: colors.text, backgroundColor: colors.surface }} />
            <View style={{ marginTop: space.lg, alignItems: 'center', borderRadius: radii.large, padding: space.lg, backgroundColor: colors.successSoft }}><Text style={{ color: colors.success, fontSize: 16, fontWeight: '800' }}>Your plan starts here</Text><Text style={{ marginTop: 4, color: colors.textSecondary }}>We will shape practice around your {examGoals.join(' + ')} goal.</Text></View>
          </MotionContainer>
        ) : null}
      </ScreenScrollView>

      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.softLine, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}><ActionButton variant="outline" onPress={() => setStep(Math.max(0, step - 1))}>Back</ActionButton></View>
          ) : null}
          <View style={{ flex: 1 }}><ActionButton disabled={!canContinue || saving} onPress={() => { if (step === steps.length - 1) completeOnboarding(); else setStep(step + 1); }}>{step === steps.length - 1 ? (saving ? 'Saving...' : 'Continue') : 'Continue'}</ActionButton></View>
        </View>
      </View>
    </View>
    </SafeAreaView>
  );
}
