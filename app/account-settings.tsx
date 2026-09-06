// Prepcore - UI Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { getProfile, updateAccount } from '../src/services/profile';
import { Card } from '../src/components/PrepcoreUI';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { colors, radii } from '../src/constants/theme';
import { space } from '../src/constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFeedback } from '../src/components/AnimatedFeedback';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { showFeedback } = useAppFeedback();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getProfile(user.id);
        if (!mounted) return;
        setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? '');
        setEmail(profile?.email ?? user.email ?? '');
        setPhone(profile?.phone ?? '');
      } catch (err) {
        if (mounted) Alert.alert('Unable to load account', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateAccount(user.id, { full_name: fullName, phone, email, currentEmail: user.email ?? '' });
      showFeedback(email.trim().toLowerCase() !== (user.email ?? '').toLowerCase() ? 'Your account was updated. Check your new email if verification is required.' : 'Your account changes have been saved.', 'success', 'bottom');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to save changes. Please try again.', 'error', 'top');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView
      className="flex-1 pt-8"
      style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="flex-row items-center">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ marginLeft: space.small, color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Account Settings</Text>
      </View>

      <Card style={{ marginTop: space.large }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={colors.muted}
          style={{ marginTop: space.small, minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.medium, color: colors.text, fontSize: 14, lineHeight: 21 }}
        />

        <Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@email.com" placeholderTextColor={colors.muted} style={{ marginTop: space.small, minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.medium, color: colors.text, fontSize: 14, lineHeight: 21 }} />

        <Text style={{ marginTop: space.large, color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>Phone Number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+234..."
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={{ marginTop: space.small, minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.medium, color: colors.text, fontSize: 14, lineHeight: 21 }}
        />
      </Card>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        className="items-center justify-center"
        style={{ marginTop: space.medium, height: 52, borderRadius: 14, backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 24 }}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>
    </ScreenScrollView>
    </SafeAreaView>
  );
}
