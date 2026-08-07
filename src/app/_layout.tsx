// Imported from per-weight subpaths, NOT the package root: the root re-exports
// all 18 faces (every weight + italics), and Metro would bundle ~5.9 MB of TTFs
// into the web build. These four are the only faces the theme uses.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlowGradient } from '@/components/brand/GlowGradient';
import { GlowLockup } from '@/components/brand/GlowLogo';
import { SyncProvider } from '@/components/providers';
import { Txt } from '@/components/ui';
import { isAdminRole } from '@/domain/permissions';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const session = useAuthStore((s) => s.session);
  const role = session?.user.role ?? null;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // Wait for both the session and the brand type before revealing the app,
  // so nothing renders in a fallback face and reflows.
  const ready = hydrated && fontsLoaded;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SyncProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={!!role && isAdminRole(role)}>
              <Stack.Screen name="(admin)" />
            </Stack.Protected>
            <Stack.Protected guard={!!role && !isAdminRole(role)}>
              <Stack.Screen name="(field)" />
            </Stack.Protected>
          </Stack>
        </SyncProvider>
        {!ready ? (
          <GlowGradient style={styles.splash}>
            <GlowLockup height={40} />
            <Txt variant="label" color={colors.text}>
              Field Operations
            </Txt>
            <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} />
          </GlowGradient>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
