import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Divider, Field, Row, Screen, Spacer, Txt } from '@/components/ui';
import { SEED_USERS } from '@/data/local/seed';
import { ROLE_LABEL } from '@/domain/permissions';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

const ROLE_EMOJI: Record<string, string> = {
  admin: '🗂️',
  photographer: '📷',
  installer: '🔧',
  reviewer: '✅',
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
    <Screen scroll>
      <View style={{ paddingVertical: spacing.xl }}>
        <Txt variant="display" color={colors.brand}>
          Glow
        </Txt>
        <Txt variant="subtitle" color={colors.textMuted}>
          Field Operations
        </Txt>
      </View>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@glow.example"
      />
      <Spacer />
      <Button title="Sign in" onPress={() => doSignIn(email)} loading={busy} full />
      {error ? (
        <Txt color={colors.dangerText} style={{ marginTop: spacing.sm }}>
          {error}
        </Txt>
      ) : null}

      <Divider />
      <Txt variant="label">Demo accounts — tap to sign in</Txt>
      <Spacer size={spacing.sm} />
      {SEED_USERS.map((u) => (
        <Card key={u.id} onPress={() => doSignIn(u.email)} style={{ marginBottom: spacing.sm }}>
          <Row gap={spacing.md}>
            <Txt variant="title">{ROLE_EMOJI[u.role]}</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle">{u.name}</Txt>
              <Txt variant="caption">
                {ROLE_LABEL[u.role]} · {u.email}
              </Txt>
            </View>
            <Txt variant="body" color={colors.brand}>
              →
            </Txt>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
