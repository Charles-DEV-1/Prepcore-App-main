import "../global.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StreakCelebrationHost } from '../src/components/StreakCelebrationHost';
import { NotificationRuntime } from '../src/components/NotificationRuntime';
import { FeedbackProvider } from '../src/components/AnimatedFeedback';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {}
      setIsReady(true);
      await SplashScreen.hideAsync();
    }

    prepare();
  }, []);

  if (!isReady) {
    return <View style={styles.loading} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <FeedbackProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StreakCelebrationHost />
        <NotificationRuntime />
      </FeedbackProvider>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#185FA5'
  }
});
