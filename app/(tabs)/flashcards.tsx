// Prepcore — Live Data & Polish
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, PanResponder, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserPlan } from '../../src/hooks/useUserPlan';
import { getFlashcardProgressStats, loadFlashcards, saveFlashcardProgress } from '../../src/services/flashcards';
import { getSubjectsWithQuestionCounts, type LiveSubject } from '../../src/services/subjects';
import { ScreenScrollView } from '../../src/components/ScreenScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Card } from '../../src/components/PrepcoreUI';
import { colors, radii, shadow } from '../../src/constants/theme';
import { space } from '../../src/constants/spacing';
import { EmptyState } from '../../src/components/EmptyState';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Flashcard = { id: string; front: string; back: string; is_premium: boolean };

function SwipeFlashcard({ card, index, total, flipped, onFlip, onSwipe }: { card: Flashcard; index: number; total: number; flipped: boolean; onFlip: () => void; onSwipe: (status: 'got_it' | 'bookmark') => void }) {
  const flip = useSharedValue(flipped ? 1 : 0);
  const drag = useSharedValue(0);
  useEffect(() => { flip.value = withTiming(flipped ? 1 : 0, { duration: 460 }); }, [flip, flipped]);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
    onPanResponderMove: (_, gesture) => { drag.value = gesture.dx; },
    onPanResponderRelease: (_, gesture) => {
      drag.value = withTiming(0, { duration: 180 });
      if (gesture.dx < -80) onSwipe('got_it');
      if (gesture.dx > 80) onSwipe('bookmark');
    },
    onPanResponderTerminate: () => { drag.value = withTiming(0, { duration: 180 }); },
  }), [drag, onSwipe]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drag.value }, { rotateZ: `${interpolate(drag.value, [-140, 0, 140], [-5, 0, 5])}deg` }] }));
  const frontStyle = useAnimatedStyle(() => ({ opacity: interpolate(flip.value, [0, 0.48, 0.5], [1, 0, 0]), transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ opacity: interpolate(flip.value, [0.48, 0.5, 1], [0, 0, 1]), transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }] }));
  return <Animated.View style={[{ marginTop: space.xl, height: 320 }, cardStyle]} {...panResponder.panHandlers}>
    <Pressable onPress={onFlip} style={{ flex: 1 }}>
      <Animated.View style={[styles.flashcard, styles.front, frontStyle]}><Text style={styles.counter}>{index + 1} / {total}</Text><Text style={styles.cardText}>{card.front}</Text><Text style={styles.hint}>Tap to reveal answer</Text></Animated.View>
      <Animated.View style={[styles.flashcard, styles.back, backStyle]}><Text style={[styles.counter, { color: '#C7D2FE' }]}>ANSWER</Text><Text style={[styles.cardText, { color: '#FFFFFF' }]}>{card.back}</Text><Text style={[styles.hint, { color: '#C7D2FE' }]}>Tap to see question</Text></Animated.View>
    </Pressable>
  </Animated.View>;
}

export default function FlashcardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = useUserPlan(user?.id);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState<LiveSubject | null>(null);
  const [stats, setStats] = useState({ known: 0, review: 0, bookmarked: 0, total: 0 });
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null);
  const card = cards[index];

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!plan.isPro) return;
      setLoading(true);
      try {
        const [subjects, progressStats] = await Promise.all([getSubjectsWithQuestionCounts('JAMB'), getFlashcardProgressStats()]);
        const firstSubject = subjects.find(item => item.questionCount > 0) ?? null;
        if (!firstSubject) { if (mounted) { setSubject(null); setCards([]); setStats(progressStats); } return; }
        const data = await loadFlashcards(firstSubject.id);
        if (mounted) { setSubject(firstSubject); setCards(data as Flashcard[]); setStats(progressStats); }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [plan.isPro]);

  async function mark(status: 'got_it' | 'review' | 'bookmark' | 'difficult') {
    const activeCard = card;
    if (!activeCard) return;
    setStats(current => ({
      ...current,
      known: current.known + (status === 'got_it' ? 1 : 0),
      bookmarked: current.bookmarked + (status === 'bookmark' ? 1 : 0),
      review: current.review + (status === 'review' || status === 'difficult' ? 1 : 0),
    }));
    setSwipeFeedback(status === 'got_it' ? 'Marked as known' : status === 'bookmark' ? 'Bookmarked for later' : status === 'review' ? 'Added to review' : 'Marked difficult');
    setFlipped(false);
    setIndex(current => (cards.length ? (current + 1) % cards.length : 0));
    if (user) void saveFlashcardProgress(user.id, activeCard.id, status);
  }

  if (!plan.isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>Flashcards</Text>
        <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Swipe, flip, and memorize concepts faster.</Text>

        <Card style={{ marginTop: space.xl }}>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>Pro feature</Text>
          <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Flashcards are Pro only. Your mobile plan is checked from the same subscriptions and lesson-center tables as the web app.</Text>
          <ActionButton className="mt-6" onPress={() => router.push('/upgrade')}>Upgrade to Pro</ActionButton>
        </Card>
      </ScreenScrollView>
      </SafeAreaView>
    );
  }

  if (loading || plan.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
        <View className="flex-1 items-center justify-center bg-[#F8FAFC]" style={{ backgroundColor: colors.page }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
    <ScreenScrollView className="flex-1 bg-[#F8FAFC] px-4 pt-8" style={{ backgroundColor: colors.page, paddingHorizontal: space.medium }} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>Flashcards</Text>
      <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>{subject ? `Pro deck for ${subject.label}.` : 'No live flashcard deck is available yet.'}</Text>

      <Card style={{ marginTop: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }}>Progress</Text>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{cards.length ? Math.round((stats.known / cards.length) * 100) : 0}% complete</Text>
        </View>
        <Text style={{ marginTop: space.sm, color: colors.textSecondary }}>Known: {stats.known} · Review: {stats.review} · Bookmarked: {stats.bookmarked}</Text>
      </Card>

      {card ? <SwipeFlashcard key={card.id} card={card} index={index} total={cards.length} flipped={flipped} onFlip={() => setFlipped(value => !value)} onSwipe={mark} /> : (
        <View style={{ marginTop: space.xl }}>
          <EmptyState
            icon="book-outline"
            title="No flashcards available"
            description="This subject does not have a live deck right now. Try another subject or come back later."
            actionLabel="Retry"
            onAction={() => {
              setLoading(true);
              void (async () => {
                try {
                  const subjects = await getSubjectsWithQuestionCounts('JAMB');
                  const firstSubject = subjects.find(item => item.questionCount > 0) ?? null;
                  if (!firstSubject) { setSubject(null); setCards([]); return; }
                  const data = await loadFlashcards(firstSubject.id);
                  setSubject(firstSubject);
                  setCards(data as Flashcard[]);
                } finally {
                  setLoading(false);
                }
              })();
            }}
          />
        </View>
      )}

      {card ? (
        <View style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.sm }}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Swipe left: Mark known</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Swipe right: Bookmark</Text></View>
          {swipeFeedback ? <Text style={{ marginTop: space.sm, textAlign: 'center', color: colors.success, fontSize: 13, fontWeight: '700' }}>{swipeFeedback}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <ActionButton variant="outline" className="flex-1" onPress={() => mark('review')}>Review</ActionButton>
            <ActionButton className="flex-1" onPress={() => mark('got_it')}>Got it</ActionButton>
          </View>
        </View>
      ) : null}
    </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flashcard: { ...StyleSheet.absoluteFillObject, borderRadius: radii.large, padding: space.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backfaceVisibility: 'hidden', ...shadow },
  front: { backgroundColor: colors.surface, borderColor: colors.softLine },
  back: { backgroundColor: '#283B87', borderColor: '#667EEA' },
  counter: { color: colors.primary, fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  cardText: { marginTop: space.lg, textAlign: 'center', color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  hint: { marginTop: space.lg, color: colors.textSecondary, fontSize: 13 },
});
