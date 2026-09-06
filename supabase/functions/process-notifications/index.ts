// Deploy with Supabase Edge Functions. This function is intentionally server-only:
// SUPABASE_SERVICE_ROLE_KEY must never be shipped in the mobile app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

type Preference = { user_id: string; streak_alerts: boolean; new_questions: boolean; weekly_report: boolean };
type Device = { user_id: string; expo_push_token: string };

async function sendExpo(messages: Array<Record<string, unknown>>) {
  if (!messages.length) return;
  const response = await fetch(expoPushUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
  if (!response.ok) throw new Error(`Expo push failed with ${response.status}`);
}

async function devicesFor(users: string[]) {
  if (!users.length) return [] as Device[];
  const { data, error } = await supabase.from('notification_devices').select('user_id,expo_push_token').in('user_id', users);
  if (error) throw error;
  return (data ?? []) as Device[];
}

async function deliver(category: string, eventKey: string, preferences: Preference[], title: string, bodyFor: (userId: string) => string, route: string) {
  const eligible = preferences.filter(preference => preference[category as keyof Preference] === true);
  const devices = await devicesFor(eligible.map(item => item.user_id));
  const userIds = [...new Set(devices.map(device => device.user_id))];
  for (const userId of userIds) {
    const { data: existing } = await supabase.from('notification_delivery_log').select('id').eq('user_id', userId).eq('category', category).eq('event_key', eventKey).maybeSingle();
    if (existing) continue;
    const messages = devices.filter(device => device.user_id === userId).map(device => ({ to: device.expo_push_token, title, body: bodyFor(userId), data: { route, category } }));
    await sendExpo(messages);
    await supabase.from('notification_delivery_log').insert({ user_id: userId, category, event_key: eventKey });
  }
}

async function processQuestionEvents(preferences: Preference[]) {
  const { data: events, error } = await supabase.from('notification_question_events').select('id,event_key,question_count').is('processed_at', null).order('created_at').limit(20);
  if (error) throw error;
  for (const event of events ?? []) {
    await deliver('new_questions', event.event_key, preferences, 'New questions are ready 📚', () => `${event.question_count} new question${event.question_count === 1 ? '' : 's'} just landed in Prepcore.`, '/practice');
    await supabase.from('notification_question_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
  }
}

async function processStreakAlerts(preferences: Preference[], today: string) {
  const { data: streaks, error } = await supabase.from('streaks').select('user_id,current_count,last_activity_date').gt('current_count', 0).neq('last_activity_date', today);
  if (error) throw error;
  const userIds = (streaks ?? []).map(item => item.user_id);
  const { data: sessions } = userIds.length ? await supabase.from('sessions').select('user_id').in('user_id', userIds).gte('completed_at', `${today}T00:00:00.000Z`) : { data: [] };
  const completed = new Set((sessions ?? []).map(item => item.user_id));
  const atRisk = (streaks ?? []).filter(item => !completed.has(item.user_id));
  const selected = preferences.filter(item => atRisk.some(streak => streak.user_id === item.user_id));
  const counts = new Map(atRisk.map(streak => [streak.user_id, streak.current_count]));
  await deliver('streak_alerts', today, selected, 'Your streak is at risk 🔥', userId => `Complete today’s study session to keep your ${counts.get(userId) ?? ''}-day streak alive.`, '/dashboard');
}

async function processWeeklyReports(preferences: Preference[], now: Date) {
  if (now.getUTCDay() !== 0) return;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  const eventKey = `week-${start.toISOString().slice(0, 10)}`;
  const eligible = preferences.filter(item => item.weekly_report);
  for (const preference of eligible) {
    const [{ data: sessions }, { data: quizzes }] = await Promise.all([
      supabase.from('sessions').select('score,total_questions').eq('user_id', preference.user_id).gte('completed_at', start.toISOString()).lt('completed_at', end.toISOString()),
      supabase.from('weekly_quiz_entries').select('id').eq('user_id', preference.user_id).gte('completed_at', start.toISOString()).lt('completed_at', end.toISOString()),
    ]);
    const questions = (sessions ?? []).reduce((sum, session) => sum + (session.total_questions ?? 0), 0);
    const average = sessions?.length ? Math.round((sessions.reduce((sum, session) => sum + (session.score ?? 0), 0)) / sessions.length) : 0;
    await deliver('weekly_report', eventKey, [preference], 'Your weekly Prepcore report is ready 📊', () => `${sessions?.length ?? 0} sessions, ${questions} questions, and a ${average}% average this week.`, '/progress');
    if (quizzes?.length) { /* Quiz activity is included in the report destination for full detail. */ }
  }
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { data: preferences, error } = await supabase.from('notification_preferences').select('user_id,streak_alerts,new_questions,weekly_report');
    if (error) throw error;
    const list = (preferences ?? []) as Preference[];
    const today = new Date().toISOString().slice(0, 10);
    await processQuestionEvents(list);
    await processStreakAlerts(list, today);
    await processWeeklyReports(list, new Date());
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Notification worker failed' }, { status: 500 });
  }
});
