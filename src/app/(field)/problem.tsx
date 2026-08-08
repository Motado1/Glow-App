import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Header } from '@/components/Header';
import { Button, Field, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { PROBLEM_TYPE_LABEL, type ProblemType } from '@/domain/types';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

const TYPES = Object.entries(PROBLEM_TYPE_LABEL) as [ProblemType, string][];

export default function ProblemScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const user = useCurrentUser();
  const { data: farm } = useRepoQuery(() => repo.getFarm(farmId!), [farmId], ['farms']);
  const [type, setType] = useState<ProblemType | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!type || !farm) return;
    setBusy(true);
    await repo.reportProblem({
      farmId: farm.id,
      glowFarmId: farm.glowFarmId,
      type,
      note: note || undefined,
      reportedBy: user?.id ?? 'unknown',
    });
    setBusy(false);
    router.back();
  }

  return (
    <Screen scroll>
      <Header eyebrow={farm?.glowFarmId} title="Flag an issue" onBack={() => router.back()} />
      <Txt variant="label">What's the issue?</Txt>
      <Spacer size={spacing.sm} />
      <Row wrap gap={spacing.sm}>
        {TYPES.map(([t, label]) => {
          const on = type === t;
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: on ? colors.brand : colors.surfaceAlt,
              }}
            >
              <Txt variant="label" color={on ? colors.textInverse : colors.textMuted}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </Row>
      <Spacer />
      <Field label="Notes (optional)" value={note} onChangeText={setNote} placeholder="Add any detail…" multiline />
      <Spacer />
      <Button title="Send to the office" icon="alert" onPress={submit} disabled={!type} loading={busy} full />
    </Screen>
  );
}
