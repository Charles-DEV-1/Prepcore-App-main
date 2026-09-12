import { useState } from 'react';
import { ActivityIndicator, Alert, View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useUserPlan } from '../src/hooks/useUserPlan';
import { subscribeUserToPro } from '../src/services/plan';
import { createFlutterwavePaymentLink, verifyFlutterwaveTransaction } from '../src/services/payments';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Card } from '../src/components/PrepcoreUI';
import { colors, radii } from '../src/constants/theme';
import { space } from '../src/constants/spacing';

const benefits = [
  'Unlimited mock exams',
  'Flashcards and active recall',
  'Weekly quiz leaderboard access',
  'Personalized progress analytics',
  'Priority study support'
];

export default function UpgradeScreen() {
  const { user } = useAuth();
  const plan = useUserPlan(user?.id);
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  async function startPayment() {
    if (!user) {
      Alert.alert('Login required', 'Sign in first to upgrade your plan.');
      return;
    }

    setProcessing(true);
    try {
      const session = await createFlutterwavePaymentLink(user.id, user.email, user.user_metadata?.full_name ?? null);
      setPaymentRef(session.tx_ref);
      setPaymentLink(session.link);
      await WebBrowser.openBrowserAsync(session.link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create payment link.';
      Alert.alert('Payment setup failed', message);
    } finally {
      setProcessing(false);
    }
  }

  async function confirmPayment() {
    if (!user || !paymentRef) return;
    setProcessing(true);
    try {
      const success = await verifyFlutterwaveTransaction(paymentRef);
      if (!success) {
        Alert.alert('Not paid yet', 'Please complete the Flutterwave payment and try again.');
        return;
      }

      await subscribeUserToPro(user.id);
      Alert.alert('Prepcore Pro activated', 'Your plan has been upgraded successfully.', [
        { text: 'Go to dashboard', onPress: () => router.replace('/dashboard') }
      ]);
    } catch (err) {
      Alert.alert('Verification failed', err instanceof Error ? err.message : 'Unable to verify payment.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>Upgrade to Pro</Text>
      <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Unlock the same Pro path used on the website: deeper practice, premium decks, and unlimited CBT prep.</Text>

      {plan.isPro ? (
        <View style={{ marginTop: space.xl, borderRadius: radii.large, backgroundColor: '#E6FFFA', padding: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-decagram" size={22} color="#065f46" />
            <Text style={{ marginLeft: space.sm, color: '#065f46', fontSize: 16, fontWeight: '700' }}>You already have Prepcore Pro.</Text>
          </View>
          <Text style={{ marginTop: space.sm, color: '#065f46' }}>Your premium access is active and you can continue using flashcards, weekly quizzes, and enhanced practice.</Text>
        </View>
      ) : null}

      <Card style={{ marginTop: space.xl }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Pro benefits</Text>
        <View style={{ marginTop: space.lg }}>
          {benefits.map(benefit => (
            <Text key={benefit} style={{ color: colors.textSecondary, marginBottom: space.sm }}>• {benefit}</Text>
          ))}
        </View>
      </Card>

      <View style={{ marginTop: space.xl, borderRadius: radii.large, backgroundColor: '#FEF3C7', padding: space.lg }}>
        <Text style={{ color: '#92400e', fontSize: 14, fontWeight: '700' }}>Pricing</Text>
        <Text style={{ marginTop: space.sm, color: '#92400e', fontSize: 24, fontWeight: '700' }}>N2,000</Text>
        <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>One-time payment with access until after JAMB.</Text>
      </View>

      {paymentLink ? (
        <View className="mt-8 space-y-4">
          <Text className="text-sm text-[#475569]">A Flutterwave payment session has been created. Complete payment in the browser and then confirm below.</Text>
          <ActionButton onPress={confirmPayment} disabled={processing}>{processing ? 'Confirming payment...' : 'Confirm payment'}</ActionButton>
          <ActionButton variant="outline" onPress={() => WebBrowser.openBrowserAsync(paymentLink)}>Open payment page again</ActionButton>
        </View>
      ) : (
        <View className="space-y-4">
          <ActionButton className="mt-8" onPress={startPayment} disabled={processing || plan.isLoading || plan.isPro}>{processing ? 'Preparing payment...' : plan.isPro ? 'Prepcore Pro active' : 'Pay with card'}</ActionButton>

        </View>
      )}

      {!plan.isLoading && plan.isPro ? (
        <View style={{ marginTop: space.lg, borderRadius: radii.large, backgroundColor: '#E6FFFA', padding: space.lg }}>
          <Text style={{ color: '#065f46' }}>Your Pro status is active. You can access premium flashcards, unlimited mock exams, and AI explanation limits.</Text>
        </View>
      ) : null}
    </ScreenScrollView>
    </SafeAreaView>
  );
}
