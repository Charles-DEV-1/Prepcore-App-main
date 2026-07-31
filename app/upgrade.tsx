import { useState } from 'react';
import { ActivityIndicator, Alert, View, Text, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useUserPlan } from '../src/hooks/useUserPlan';
import { subscribeUserToPro } from '../src/services/plan';
import { createFlutterwavePaymentLink, verifyFlutterwaveTransaction } from '../src/services/payments';
import { ScreenScrollView } from '../src/components/ScreenScrollView';

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

  async function activatePro() {
    if (!user) {
      Alert.alert('Login required', 'Sign in first to upgrade your plan.');
      return;
    }

    if (plan.isPro) {
      Alert.alert('Already Pro', 'Your Prepcore Pro plan is already active.');
      return;
    }

    setProcessing(true);
    try {
      await subscribeUserToPro(user.id);
      Alert.alert('Prepcore Pro activated', 'Your plan has been upgraded successfully.', [
        { text: 'Go to dashboard', onPress: () => router.replace('/dashboard') }
      ]);
    } catch (err) {
      Alert.alert('Upgrade failed', err instanceof Error ? err.message : 'Unable to activate Pro. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

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
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
      <Text className="text-2xl font-bold text-[#0f172a]">Upgrade to Pro</Text>
      <Text className="mt-2 text-sm text-[#64748b]">Unlock the same Pro path used on the website: deeper practice, premium decks, and unlimited CBT prep.</Text>

      <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <Text className="text-lg font-semibold text-[#0f172a]">Pro benefits</Text>
        <View className="mt-4 space-y-3">
          {benefits.map(benefit => (
            <Text key={benefit} className="text-[#475569]">- {benefit}</Text>
          ))}
        </View>
      </View>

      <View className="mt-6 rounded-3xl bg-[#FEF3C7] p-5 shadow-sm shadow-black/5">
        <Text className="font-semibold text-[#92400e]">Pricing</Text>
        <Text className="mt-3 text-2xl font-bold text-[#92400e]">N2,000</Text>
        <Text className="mt-2 text-[#475569]">One-time payment with access until after JAMB.</Text>
      </View>

      {paymentLink ? (
        <View className="mt-8 space-y-4">
          <Text className="text-sm text-[#475569]">A Flutterwave payment session has been created. Complete payment in the browser and then confirm below.</Text>
          <Pressable
            onPress={confirmPayment}
            disabled={processing}
            className="rounded-2xl bg-[#10B981] py-4 items-center"
          >
            <Text className="text-white font-semibold">{processing ? 'Confirming payment...' : 'Confirm payment'}</Text>
          </Pressable>
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(paymentLink)}
            className="rounded-2xl border border-[#185FA5] bg-white py-4 items-center"
          >
            <Text className="text-[#185FA5] font-semibold">Open payment page again</Text>
          </Pressable>
        </View>
      ) : (
        <View className="space-y-4">
          <Pressable
            onPress={startPayment}
            disabled={processing || plan.isLoading || plan.isPro}
            className="mt-8 rounded-2xl bg-[#185FA5] py-4 items-center"
          >
            <Text className="text-white font-semibold">
              {processing ? 'Preparing payment...' : plan.isPro ? 'Prepcore Pro active' : 'Pay with card'}
            </Text>
          </Pressable>

          <Pressable
            onPress={activatePro}
            disabled={processing || plan.isLoading || plan.isPro}
            className="rounded-2xl border border-[#CBD5E1] bg-white py-4 items-center"
          >
            <Text className="text-[#185FA5] font-semibold">Activate Pro without payment (demo)</Text>
          </Pressable>
        </View>
      )}

      {!plan.isLoading && plan.isPro ? (
        <View className="mt-4 rounded-2xl bg-[#E6FFFA] p-4">
          <Text className="text-sm text-[#065f46]">Your Pro status is active. You can access premium flashcards, unlimited mock exams, and AI explanation limits.</Text>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}
