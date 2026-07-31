import AsyncStorage from '@react-native-async-storage/async-storage';
import { GROQ_API_KEY } from '../lib/env';

const AI_USAGE_PREFIX = 'ai_usage_';
const FREE_LIMIT = 5;
const PRO_LIMIT = 10;

function usageKey() {
  return AI_USAGE_PREFIX + new Date().toISOString().split('T')[0];
}

export async function getTodayUsage() {
  const stored = await AsyncStorage.getItem(usageKey());
  return Number.parseInt(stored ?? '0', 10) || 0;
}

export async function getAIExplanation(params: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  subject: string;
  isPro: boolean;
}) {
  const limit = params.isPro ? PRO_LIMIT : FREE_LIMIT;
  const used = await getTodayUsage();

  if (used >= limit) {
    throw new Error(params.isPro ? 'Daily AI limit reached (10/day on Pro).' : 'Daily AI limit reached. Upgrade to Pro for more.');
  }

  if (!GROQ_API_KEY) {
    throw new Error('Missing Groq API key.');
  }

  const optionsText = Object.entries(params.options).map(([key, value]) => `${key}. ${value}`).join('\n');
  let response: Response;

  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'user',
            content: `You are a JAMB tutor. Explain this answer to a Nigerian student.
Subject: ${params.subject}
Question: ${params.question}
Options:
${optionsText}
Correct Answer: ${params.correctAnswer}
Basic Explanation: ${params.explanation}
Give a clear, simple explanation under 150 words. Be encouraging.`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });
  } catch (err) {
    throw new Error(err instanceof Error ? `AI network request failed: ${err.message}` : 'AI network request failed.');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  await AsyncStorage.setItem(usageKey(), String(used + 1));
  return data.choices?.[0]?.message?.content ?? 'Could not generate explanation.';
}
