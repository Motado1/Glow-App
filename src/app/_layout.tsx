import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
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
        {!hydrated ? (
          <View style={styles.splash} pointerEvents="none">
            <Txt variant="display" color={colors.textInverse}>
              Glow
            </Txt>
            <Txt variant="subtitle" color={colors.accentSoft}>
              Field Operations
            </Txt>
            <ActivityIndicator color={colors.textInverse} style={{ marginTop: 16 }} />
          </View>
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
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
