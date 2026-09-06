import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { Card } from '../src/components/PrepcoreUI';
import { ScreenScrollView } from '../src/components/ScreenScrollView';
import { colors } from '../src/constants/theme';
import { space } from '../src/constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelStudyReminder, getNotificationPermission, getNotificationPreferences, type NotificationKey, type NotificationPermissionState, registerDevicePushToken, requestNotificationPermission, saveNotificationPreferences, scheduleStudyReminder, openNotificationSettings, DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../src/services/notifications';

const rows: Array<{ key: NotificationKey; title: string; body: string }> = [
  { key: 'studyReminders', title: 'Study Reminders', body: 'Daily at 7:00 PM. You can customize the time later.' },
  { key: 'streakAlerts', title: 'Streak Alerts', body: 'Alert only when today’s study activity is still incomplete.' },
  { key: 'newQuestions', title: 'New Questions Added', body: 'Only when a real question batch is published.' },
  { key: 'weeklyReport', title: 'Weekly Progress Report', body: 'A real summary delivered every Sunday.' },
];

const permissionCopy: Record<NotificationPermissionState, string> = {
  granted: 'Device notifications are allowed.',
  undetermined: 'Permission is requested only when you enable a category.',
  denied: 'Device notifications are blocked. Enable them in system settings.',
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Please try again.';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permission, setPermission] = useState<{ state: NotificationPermissionState; canAskAgain: boolean }>({ state: 'undetermined', canAskAgain: true });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<NotificationKey | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const [saved, currentPermission] = await Promise.all([getNotificationPreferences(user.id), getNotificationPermission()]);
        let effective = saved;
        if (currentPermission.state !== 'granted' && Object.values(saved).some(value => value === true)) {
          effective = { ...saved, studyReminders: false, streakAlerts: false, newQuestions: false, weeklyReport: false };
          await cancelStudyReminder();
        } else if (currentPermission.state === 'granted' && saved.studyReminders) {
          await scheduleStudyReminder(saved.studyReminderHour, saved.studyReminderMinute);
          if (saved.streakAlerts || saved.newQuestions || saved.weeklyReport) {
            try { await registerDevicePushToken(user.id); } catch { /* The next explicit enable will surface token setup errors. */ }
          }
        }
        if (mounted) { setSettings(effective); setPermission(currentPermission); }
      } catch (error) {
        if (mounted) Alert.alert('Unable to load notifications', errorMessage(error));
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [user]);

  async function toggle(key: NotificationKey) {
    if (!user || savingKey) return;
    const turningOn = !settings[key];
    setSavingKey(key);
    try {
      if (turningOn) {
        const granted = await requestNotificationPermission();
        const currentPermission = await getNotificationPermission();
        setPermission(currentPermission);
        if (!granted) {
          Alert.alert('Notifications are off', currentPermission.canAskAgain ? 'Allow notification permission to turn this setting on.' : 'Notifications are blocked in system settings.', currentPermission.canAskAgain ? [{ text: 'OK' }] : [{ text: 'Open settings', onPress: () => void openNotificationSettings() }, { text: 'Cancel', style: 'cancel' }]);
          return;
        }
        if (key !== 'studyReminders') await registerDevicePushToken(user.id);
        const next = { ...settings, [key]: true };
        await saveNotificationPreferences(user.id, next);
        if (key === 'studyReminders') await scheduleStudyReminder(next.studyReminderHour, next.studyReminderMinute);
        setSettings(next);
      } else {
        const next = { ...settings, [key]: false };
        setSettings(next);
        await saveNotificationPreferences(user.id, next);
        if (key === 'studyReminders') await cancelStudyReminder();
      }
    } catch (error) {
      if (!turningOn) {
        setSettings(settings);
        if (key === 'studyReminders' && settings.studyReminders && permission.state === 'granted') void scheduleStudyReminder(settings.studyReminderHour, settings.studyReminderMinute);
      }
      Alert.alert('Notification setting not enabled', errorMessage(error));
    } finally { setSavingKey(null); }
  }

  if (authLoading || loading) return <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.page }}><ActivityIndicator color={colors.primary} /></View>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}><ScreenScrollView className="flex-1 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
    <View className="flex-row items-center"><Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}><Ionicons name="chevron-back" size={24} color={colors.ink} /></Pressable><Text style={{ marginLeft: space.small, color: colors.ink, fontSize: 24, fontWeight: '700' }}>Notifications</Text></View>
    <Card style={{ marginTop: space.large }}><Text style={{ color: colors.text, fontSize: 13 }}>{permissionCopy[permission.state]}</Text>{permission.state === 'denied' ? <Pressable onPress={() => void openNotificationSettings()} style={{ marginTop: space.sm }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Open device notification settings</Text></Pressable> : null}<Text style={{ marginTop: space.sm, color: colors.muted, fontSize: 12, lineHeight: 18 }}>Study Reminders are local and do not need a server push token. Live server alerts require a device push transport on the production build.</Text>{rows.map((row, index) => <View key={row.key}><View className="flex-row items-center justify-between" style={{ paddingVertical: 16 }}><View className="flex-1 pr-4"><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{row.title}</Text><Text style={{ marginTop: 3, color: colors.text, fontSize: 14, lineHeight: 21 }}>{row.body}</Text></View><Switch value={settings[row.key]} disabled={savingKey === row.key} onValueChange={() => void toggle(row.key)} trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }} thumbColor={settings[row.key] ? colors.primary : colors.white} /></View>{index < rows.length - 1 ? <View className="h-px" style={{ backgroundColor: colors.softLine }} /> : null}</View>)}</Card>
  </ScreenScrollView></SafeAreaView>;
}
