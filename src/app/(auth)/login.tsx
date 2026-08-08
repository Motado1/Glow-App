import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlowGradient } from '@/components/brand/GlowGradient';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { GlowLockup, GlowSymbol } from '@/components/brand/GlowLogo';
import { Button, Divider, Field, Row, Screen, Spacer, Txt } from '@/components/ui';
import { SEED_USERS } from '@/data/local/seed';
import { ROLE_LABEL } from '@/domain/permissions';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

const ROLE_ICON: Record<string, IconName> = {
  admin: 'folder',
  photographer: 'camera',
  installer: 'box',
  reviewer: 'review',
};

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doSignIn(em: string) {
    setBusy(true);
    setError(null);
    try {
      await signIn(em);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
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
        />
        <Spacer />
        <Button title="Sign in" onPress={() => doSignIn(email)} loading={busy} full />
        {error ? (
          <Txt color={colors.dangerText} style={{ marginTop: spacing.sm }}>
            {error}
          </Txt>
        ) : null}

        <Divider />
        <Txt variant="overline">Select an account</Txt>
        <Spacer size={spacing.sm} />
        {/* A list separated by hairlines, not a stack of boxed cards — the
            site's way of setting a short index. */}
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          {SEED_USERS.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => doSignIn(u.email)}
              style={({ pressed }) => [
                {
                  paddingVertical: spacing.md,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <Row gap={spacing.md}>
                <GlowIcon name={ROLE_ICON[u.role]} size={20} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{u.name}</Txt>
                  <Txt variant="overline">{ROLE_LABEL[u.role]}</Txt>
                </View>
                <GlowIcon name="arrow-right" size={15} color={colors.textFaint} />
              </Row>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
