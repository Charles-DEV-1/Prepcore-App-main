import "../global.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

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
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#185FA5'
  }
});
