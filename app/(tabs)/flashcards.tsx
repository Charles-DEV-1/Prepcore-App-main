// Prepcore — Live Data & Polish
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { loadFlashcards, saveFlashcardProgress } from '../../src/services/flashcards';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';

type Flashcard = { id: string; front: string; back: string; is_premium: boolean };

export default function FlashcardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = useUserPlan(user?.id);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState<LiveSubject | null>(null);
  const card = cards[index];

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!plan.isPro) return;
      setLoading(true);
      try {
        const subjects = await getSubjectsWithQuestionCounts('JAMB');
        const firstSubject = subjects.find(item => item.questionCount > 0) ?? null;
        if (!firstSubject) { if (mounted) { setSubject(null); setCards([]); } return; }
        const data = await loadFlashcards(firstSubject.id);
        if (mounted) { setSubject(firstSubject); setCards(data as Flashcard[]); }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [plan.isPro]);

  async function mark(status: 'got_it' | 'review') {
    if (user && card) {
      await saveFlashcardProgress(user.id, card.id, status);
    }
    setFlipped(false);
    setIndex(current => (cards.length ? (current + 1) % cards.length : 0));
  }

  if (!plan.isPro) {
    return (
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
        <Text className="text-2xl font-bold text-[#0f172a]">Flashcards</Text>
        <Text className="mt-2 text-sm text-[#64748b]">Swipe, flip, and memorize concepts faster.</Text>

        <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm shadow-black/5">
          <Text className="text-lg font-semibold text-[#0f172a]">Pro feature</Text>
          <Text className="mt-3 text-[#475569]">Flashcards are Pro only. Your mobile plan is checked from the same subscriptions and lesson-center tables as the web app.</Text>
          <Pressable onPress={() => router.push('/upgrade')} className="mt-6 rounded-2xl bg-[#185FA5] py-4 items-center">
            <Text className="text-white text-base font-semibold">Upgrade to Pro</Text>
          </Pressable>
        </View>
      </ScreenScrollView>
    );
  }

  if (loading || plan.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator color="#185FA5" />
      </View>
    );
  }

  return (
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8">
      <Text className="text-2xl font-bold text-[#0f172a]">Flashcards</Text>
      <Text className="mt-2 text-sm text-[#64748b]">{subject ? `Pro deck for ${subject.label}.` : 'No live flashcard deck is available yet.'}</Text>

      {card ? (
        <Pressable onPress={() => setFlipped(value => !value)} className="mt-8 min-h-[320px] rounded-3xl bg-white p-6 shadow-sm shadow-black/5 items-center justify-center">
          <Text className="text-sm font-semibold text-[#185FA5]">{index + 1} / {cards.length}</Text>
          <Text className="mt-8 text-center text-2xl font-bold leading-9 text-[#0f172a]">{flipped ? card.back : card.front}</Text>
          <Text className="mt-8 text-sm text-[#64748b]">Tap to flip</Text>
        </Pressable>
      ) : (
        <View className="mt-8 rounded-3xl bg-white p-6">
          <Text className="text-[#64748b]">No flashcards found for this subject.</Text>
        </View>
      )}

      {card ? (
        <View className="mt-6 flex-row gap-3">
          <Pressable onPress={() => mark('review')} className="flex-1 rounded-2xl border border-[#CBD5E1] bg-white py-4 items-center">
            <Text className="font-semibold text-[#185FA5]">Review</Text>
          </Pressable>
          <Pressable onPress={() => mark('got_it')} className="flex-1 rounded-2xl bg-[#185FA5] py-4 items-center">
            <Text className="text-white font-semibold">Got it</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}
