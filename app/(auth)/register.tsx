  <Text style={{ marginTop: space.md, color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>Enter your email to receive a secure link that saves your subjects and starts your practice journey.</Text>
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatAuthError, sendSignupMagicLink } from '../../src/services/auth';
import { ActionButton, BrandMark } from '../../src/components/PrepcoreUI';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createAccount() {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setStatus(null);

    if (!normalizedEmail) {
      setError('Enter your email to continue.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendSignupMagicLink(normalizedEmail);
      setStatus(`Verification link requested for ${result.email}. Check your inbox and spam folder. Your onboarding plan is saved and will be applied after verification.`);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const result = await sendSignupMagicLink(email);
      setStatus(`A new verification link was requested for ${result.email}. Check your inbox and spam folder.`);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl }}>
        <BrandMark size={64} showName />
        <Text style={{ marginTop: space.xxxl, color: colors.ink, fontSize: 28, fontWeight: '800', lineHeight: 35 }}>Great! Save your prep plan.</Text>
        <Text style={{ marginTop: space.md, color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>Enter your email to receive a secure link that saves your subjects and starts your practice journey.</Text>

        <View style={{ marginTop: space.xxl, gap: space.md }}>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={{ minHeight: 54, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: space.lg, color: colors.text, fontSize: 16, ...shadow }} />
        </View>

        <ActionButton className="mt-7" disabled={loading} onPress={() => void createAccount()}>{loading ? <ActivityIndicator color={colors.white} /> : 'Create account and start practicing'}</ActionButton>
        {status ? <Text style={{ marginTop: space.md, color: colors.success, textAlign: 'center', lineHeight: 20 }}>{status}</Text> : null}
        {error ? <Text style={{ marginTop: space.md, color: colors.danger, textAlign: 'center', lineHeight: 20 }}>{error}</Text> : null}
        {status ? <Text onPress={() => void resendConfirmation()} style={{ marginTop: space.md, color: colors.primary, textAlign: 'center', fontWeight: '800' }}>Resend confirmation email</Text> : null}
        <Text style={{ marginTop: space.xl, color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 19 }}>Your personalized subjects will be saved securely to your Prepcore account.</Text>
        <Text onPress={() => router.replace('/(auth)/login')} style={{ marginTop: space.xl, color: colors.primary, textAlign: 'center', fontWeight: '800' }}>Already have an account? Sign in</Text>
      </View>
    </SafeAreaView>
  );
}
