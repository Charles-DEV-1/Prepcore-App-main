import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'You must be signed in.' }, { status: 401, headers: corsHeaders });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return Response.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401, headers: corsHeaders });
  try {
    const body = await request.json();
    if (!body?.question || !body?.correctAnswer) return Response.json({ error: 'Question data is incomplete.' }, { status: 400, headers: corsHeaders });
    const optionsText = Object.entries(body.options ?? {}).map(([key, value]) => `${key}. ${String(value)}`).join('\n');
    const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('GROQ_API_KEY')}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: `You are a JAMB tutor. Explain this answer to a Nigerian student.\nSubject: ${body.subject ?? ''}\nQuestion: ${body.question}\nOptions:\n${optionsText}\nCorrect Answer: ${body.correctAnswer}\nBasic Explanation: ${body.explanation ?? ''}\nGive a clear, simple explanation under 150 words. Be encouraging.` }],
        max_completion_tokens: 300,
        temperature: 0.7,
      }),
    });
    const payload = await groq.json();
    if (!groq.ok) return Response.json({ error: `AI provider error (${groq.status}). ${payload?.error?.message ?? 'Please try again later.'}` }, { status: 502, headers: corsHeaders });
    const explanation = payload?.choices?.[0]?.message?.content;
    if (!explanation) return Response.json({ error: 'AI did not return an explanation.' }, { status: 502, headers: corsHeaders });
    return Response.json({ explanation }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'AI explanation failed.' }, { status: 500, headers: corsHeaders });
  }
});
