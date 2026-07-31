// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { Card } from '../src/components/PrepcoreUI';
import { colors } from '../src/constants/theme';
import { space } from '../src/constants/spacing';

const faqs = [
  ['How do I start a practice session?', 'Open Practice, choose JAMB or WAEC, then tap the subject you want to study.'],
  ['What is the difference between Practice and Exam mode?', 'Practice is flexible subject-by-subject study. Exam mode simulates timed mock conditions.'],
  ['How does the AI explanation work?', 'After answering, Prepcore can generate a simple explanation that walks through the answer step by step.'],
  ['How do I upgrade to Pro?', 'Open Profile and tap Upgrade to Pro from your plan card.'],
  ['How does the referral system work?', 'Share your referral link with friends. Eligible signups add to your referral progress.']
] as const;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [openIndex]);

  function toggle(index: number) {
    setOpenIndex(current => (current === index ? null : index));
  }

  return (
    <ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-row items-center">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ marginLeft: space.small, color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Help & Support</Text>
      </View>

      <Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>FAQ</Text>
      <Card style={{ marginTop: space.small }}>
        {faqs.map(([question, answer], index) => {
          const isOpen = openIndex === index;
          return (
            <View key={question}>
              <Pressable onPress={() => toggle(index)} className="flex-row items-center justify-between" style={{ paddingVertical: 14 }}>
                <Text style={{ flex: 1, paddingRight: space.small, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{question}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
              </Pressable>
              {isOpen ? (
                <Text style={{ paddingBottom: 14, color: colors.text, fontSize: 14, fontWeight: '400', lineHeight: 21 }}>{answer}</Text>
              ) : null}
              {index < faqs.length - 1 ? <View className="h-px" style={{ backgroundColor: colors.softLine }} /> : null}
            </View>
          );
        })}
      </Card>

      <Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Still need help?</Text>
      <Card style={{ marginTop: space.small }}>
        <Pressable onPress={() => Linking.openURL('mailto:support@prepcore.com.ng')} className="flex-row items-center" style={{ paddingVertical: 14 }}>
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} />
          </View>
          <Text style={{ marginLeft: space.medium, color: colors.primary, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>support@prepcore.com.ng</Text>
        </Pressable>
        <View className="h-px" style={{ backgroundColor: colors.softLine }} />
        <Pressable onPress={() => Linking.openURL('whatsapp://send?text=Hello%20Prepcore%20support')} className="flex-row items-center" style={{ paddingVertical: 14 }}>
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: '#DCFCE7' }}>
            <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
          </View>
          <Text style={{ marginLeft: space.medium, color: colors.primary, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>Chat with us</Text>
        </Pressable>
      </Card>
    </ScreenScrollView>
  );
}
