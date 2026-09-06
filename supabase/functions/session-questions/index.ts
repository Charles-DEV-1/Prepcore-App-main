import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const ALOC_URL = 'https://dev.aloc.com.ng/api/v1/questions';
const CACHE_TARGET = 300;
const FETCH_BATCH_SIZE = 40;
const subjectSlugs: Record<string, string> = { english: 'english', 'english language': 'english', mathematics: 'mathematics', physics: 'physics', chemistry: 'chemistry', biology: 'biology', economics: 'economics', government: 'government', literature: 'englishlit', 'literature in english': 'englishlit', crs: 'crk', 'christian religious studies': 'crk', geography: 'geography' };

type StoredQuestion = { id: string; prompt: string; options: Record<string, string>; correct_answer: string; explanation: string | null; topic: string | null; year: number | null; subject_id: string; exam_type: string };
type ImportedQuestion = { source_question_id: string; prompt: string; options: Record<string, string>; correct_answer: string; explanation: string; topic: string; year: number | null };

function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
function isRenderable(question: Pick<StoredQuestion, 'prompt' | 'options' | 'correct_answer'>) { return Boolean(question.prompt?.trim() && !/^solution\s*:/i.test(question.prompt.trim()) && !/<\/?(?:math|mrow|mi|mn|mo|mfrac|msup)\b/i.test(question.prompt) && Object.keys(question.options ?? {}).length >= 2 && question.options?.[question.correct_answer]); }

function normalizeAlocQuestion(value: unknown): ImportedQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const prompt = row.question ?? row.prompt ?? row.text;
  if (!prompt || typeof prompt !== 'string' || !row.options || typeof row.options !== 'object' || Array.isArray(row.options)) return null;
  const options = Object.entries(row.options as Record<string, unknown>).reduce<Record<string, string>>((all, [key, item]) => { if (typeof item === 'string') all[key.replace(/^option\s*/i, '').toUpperCase()] = item; return all; }, {});
  const suppliedAnswer = String(row.correctAnswer ?? row.answer ?? row.correct_answer ?? '');
  const submitted = suppliedAnswer.replace(/^option\s*/i, '').trim().toUpperCase();
  const correctAnswer = options[submitted] ? submitted : Object.entries(options).find(([, text]) => text.trim() === suppliedAnswer.trim())?.[0];
  if (!correctAnswer || !isRenderable({ prompt, options, correct_answer: correctAnswer })) return null;
  return { source_question_id: String(row.id ?? row.question_id ?? `${prompt}-${correctAnswer}`), prompt, options, correct_answer: correctAnswer, explanation: String(row.solution ?? row.explanation ?? ''), topic: String(row.topic ?? row.section ?? ''), year: Number.isFinite(Number(row.year)) ? Number(row.year) : null };
}

async function readCache(admin: ReturnType<typeof createClient>, subjectId: string, examType: string) {
  const { data, error } = await admin.from('questions').select('id,prompt,options,correct_answer,explanation,topic,year,subject_id,exam_type').eq('subject_id', subjectId).eq('exam_type', examType).limit(CACHE_TARGET * 2);
  if (error) throw error;
  return (data ?? []).filter(isRenderable) as StoredQuestion[];
}

async function fetchAndStoreBatch(admin: ReturnType<typeof createClient>, apiKey: string, slug: string, subjectId: string, examType: string) {
  const url = new URL(ALOC_URL);
  url.searchParams.set('subject', slug);
  url.searchParams.set('examType', examType);
  url.searchParams.set('limit', String(FETCH_BATCH_SIZE));
  const response = await fetch(url, { headers: { 'X-API-Key': apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`ALOC returned HTTP ${response.status}`);
  const payload = await response.json() as { data?: unknown; questions?: unknown };
  const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.questions) ? payload.questions : [];
  const normalized = rows.map(normalizeAlocQuestion).filter((question): question is ImportedQuestion => question !== null);
  if (!normalized.length) return 0;
  const sourceIds = normalized.map(question => question.source_question_id);
  const { data: existing, error: existingError } = await admin.from('questions').select('source_question_id').eq('source', 'aloc').in('source_question_id', sourceIds);
  if (existingError) throw existingError;
  const existingIds = new Set((existing ?? []).map(question => question.source_question_id));
  const insertRows = normalized.filter(question => !existingIds.has(question.source_question_id)).map(question => ({ ...question, subject_id: subjectId, exam_type: examType, source: 'aloc' }));
  if (!insertRows.length) return 0;
  const { error: insertError } = await admin.from('questions').insert(insertRows);
  if (insertError) throw insertError;
  return insertRows.length;
}

async function refillCache(admin: ReturnType<typeof createClient>, apiKey: string, slug: string, subjectId: string, examType: string) {
  let cached = await readCache(admin, subjectId, examType);
  while (cached.length < CACHE_TARGET) {
    const added = await fetchAndStoreBatch(admin, apiKey, slug, subjectId, examType);
    if (!added) break;
    cached = await readCache(admin, subjectId, examType);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'You must be signed in.' }, { status: 401, headers: corsHeaders });
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401, headers: corsHeaders });
  try {
    const body = await request.json();
    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : '';
    const examType = body?.examType === 'waec' ? 'waec' : body?.examType === 'jamb' ? 'jamb' : '';
    const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 60);
    if (!subjectId || !examType) return Response.json({ error: 'Invalid question request.' }, { status: 400, headers: corsHeaders });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: subject } = await admin.from('subjects').select('id,name').eq('id', subjectId).maybeSingle();
    if (!subject) return Response.json({ error: 'Unknown subject.' }, { status: 404, headers: corsHeaders });
    let cached = await readCache(admin, subjectId, examType);
    const apiKey = Deno.env.get('ALOC_API_KEY');
    const slug = subjectSlugs[subject.name.trim().toLowerCase()];
    if (cached.length < limit && apiKey && slug) {
      try { await fetchAndStoreBatch(admin, apiKey, slug, subjectId, examType); cached = await readCache(admin, subjectId, examType); }
      catch (error) { console.warn('ALOC batch fetch failed', error instanceof Error ? error.message : String(error)); }
    }
    if (cached.length < CACHE_TARGET && apiKey && slug) {
      const runtime = globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } };
      runtime.EdgeRuntime?.waitUntil(refillCache(admin, apiKey, slug, subjectId, examType).catch(error => console.warn('ALOC cache refill failed', error instanceof Error ? error.message : String(error))));
    }
    return Response.json({ questions: shuffle(cached).slice(0, limit), cacheCount: cached.length, cacheTarget: CACHE_TARGET }, { headers: corsHeaders });
  } catch (error) {
    console.error('session-questions failed', error instanceof Error ? error.message : String(error));
    return Response.json({ error: 'Question service is temporarily unavailable. Please try again.' }, { status: 500, headers: corsHeaders });
  }
});
