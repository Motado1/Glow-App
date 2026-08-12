import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GlowGradient } from '@/components/brand/GlowGradient';
import { GlowLockup, GlowSymbol } from '@/components/brand/GlowLogo';
import { Button, Field, Screen, Spacer, Txt } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

/**
 * Sign in with an email address.
 *
 * This screen used to list every account as a tap-to-enter card. That was
 * convenient for a demo and wrong for a real tool: it published the roster to
 * anyone who opened the app, and it made the whole thing read as a mock-up.
 * The address is now typed and matched against the real user list.
 */
export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
      setBusy(false);
    }
  }

  return (
    <Screen scroll padded={false}>
      {/* Brand hero — the gradient is reserved for surfaces like this. */}
      <GlowGradient
        texture
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xxl,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
        }}
      >
        <GlowSymbol size={72} />
        <GlowLockup height={34} />
        <Txt variant="label" color={colors.text}>
          Field Operations
        </Txt>
      </GlowGradient>

      <View style={{ padding: spacing.lg }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="you@glow.org"
          autoFocus
        />
        <Spacer />
        <Button
          title="Sign in"
          icon="arrow-right"
          onPress={doSignIn}
          loading={busy}
          disabled={!email.trim()}
          full
        />
        {error ? (
          <Txt color={colors.dangerText} style={{ marginTop: spacing.md }}>
            {error}
          </Txt>
        ) : null}

        <Spacer size={spacing.xl} />
        <Txt variant="caption" align="center">
          Ask your administrator to add you if you don&rsquo;t have an account yet.
        </Txt>
      </View>
    </Screen>
  );
}
