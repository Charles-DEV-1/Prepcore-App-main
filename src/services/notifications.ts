import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export type NotificationKey = 'studyReminders' | 'streakAlerts' | 'newQuestions' | 'weeklyReport';
export type NotificationPreferences = {
  studyReminders: boolean;
  streakAlerts: boolean;
  newQuestions: boolean;
  weeklyReport: boolean;
  studyReminderHour: number;
  studyReminderMinute: number;
};
export type NotificationPermissionState = 'granted' | 'undetermined' | 'denied';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  studyReminders: false,
  streakAlerts: false,
  newQuestions: false,
  weeklyReport: false,
  studyReminderHour: 19,
  studyReminderMinute: 0,
};

export const NOTIFICATION_IDS = {
  studyReminder: 'prepcore-study-reminder',
} as const;

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('prepcore-general', {
      name: 'Prepcore notifications',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
    void Notifications.setNotificationChannelAsync('prepcore-reminders', {
      name: 'Study reminders',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#2563EB',
    });
  }
}

export async function getNotificationPermission(): Promise<{ state: NotificationPermissionState; canAskAgain: boolean }> {
  const permissions = await Notifications.getPermissionsAsync();
  return { state: permissions.granted ? 'granted' : permissions.status === 'undetermined' ? 'undetermined' : 'denied', canAskAgain: permissions.canAskAgain };
}

export async function requestNotificationPermission() {
  configureNotificationHandler();
  const current = await getNotificationPermission();
  if (current.state === 'granted') return true;
  if (current.state === 'denied' && !current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    studyReminders: Boolean(data.study_reminders),
    streakAlerts: Boolean(data.streak_alerts),
    newQuestions: Boolean(data.new_questions),
    weeklyReport: Boolean(data.weekly_report),
    studyReminderHour: Number(data.study_reminder_hour ?? 19),
    studyReminderMinute: Number(data.study_reminder_minute ?? 0),
  };
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  const { error } = await supabase.from('notification_preferences').upsert({
    user_id: userId,
    study_reminders: preferences.studyReminders,
    streak_alerts: preferences.streakAlerts,
    new_questions: preferences.newQuestions,
    weekly_report: preferences.weeklyReport,
    study_reminder_hour: preferences.studyReminderHour,
    study_reminder_minute: preferences.studyReminderMinute,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function registerDevicePushToken(userId: string) {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Expo project ID is missing from app configuration.');
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (Platform.OS === 'android' && /FirebaseApp|Firebase|FCM|ExpoPushTokenManager/i.test(message)) {
      throw new Error('Android server notifications need an FCM transport configured for this development build. Study Reminders can still use local notifications without Firebase.');
    }
    throw error;
  }
  const { error } = await supabase.rpc('claim_notification_device', { p_expo_push_token: token, p_platform: Platform.OS });
  if (error) throw error;
}

export async function removeDevicePushTokens(userId: string) {
  const { error } = await supabase.from('notification_devices').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function scheduleStudyReminder(hour: number, minute: number) {
  await cancelStudyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.studyReminder,
    content: { title: 'Time to study 📚', body: 'Keep your Prepcore progress moving.', data: { route: '/practice', category: 'studyReminders' }, sound: 'default' },
    trigger: { hour, minute, repeats: true, channelId: 'prepcore-reminders' },
  });
}

export async function cancelStudyReminder() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.studyReminder); } catch { /* Already cancelled or unavailable. */ }
}
