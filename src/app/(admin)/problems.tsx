import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Button, Card, EmptyState, IconLine, Row, Screen, SegmentedControl, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { PROBLEM_TYPE_LABEL } from '@/domain/types';
import { relativeTime } from '@/lib/date';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

/**
 * Problems reported from the field. Lifted out of the "More" tab, where it was
 * buried under a notifications list with no way to reach it directly.
 *
 * Field workers never see this screen — a photographer who flags a locked gate
 * gets a neutral "on hold", not a problem log.
 */
export default function Problems() {
  const [resolved, setResolved] = useState(false);
  const { data: problems, refresh } = useRepoQuery(
    () => repo.listProblems({ resolved }),
    [resolved],
    ['problems'],
  );
  const list = problems ?? [];

  async function resolveOne(id: string) {
    await repo.resolveProblem(id);
    refresh();
  }

  return (
    <Screen scroll>
      <Header
        eyebrow="From the field"
        title="Problems"
        subtitle={resolved ? undefined : `${list.length} open`}
        onBack={() => router.back()}
      />

      <SegmentedControl
        options={[
          { value: 'open', label: 'Open', icon: 'alert' },
          { value: 'resolved', label: 'Resolved', icon: 'check' },
        ]}
        value={resolved ? 'resolved' : 'open'}
        onChange={(v) => setResolved(v === 'resolved')}
      />
      <Spacer size={spacing.md} />

      {list.length === 0 ? (
        <EmptyState
          title={resolved ? 'Nothing resolved yet' : 'No open problems'}
          subtitle={
            resolved
              ? 'Problems you close show up here.'
              : 'Locked gates, wrong addresses and access refusals get reported here the moment someone hits them.'
          }
        />
      ) : (
        list.map((p) => (
          <Card key={p.id} style={{ marginBottom: spacing.sm }}>
            <Row justify="space-between" align="flex-start" gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{PROBLEM_TYPE_LABEL[p.type]}</Txt>
                <Txt variant="mono" style={{ marginTop: 2 }}>
                  {p.glowFarmId}
                </Txt>
                <Txt variant="caption">{relativeTime(p.reportedAt)}</Txt>
                {p.note ? (
                  <View style={{ marginTop: spacing.xs }}>
                    <IconLine icon="message">{p.note}</IconLine>
                  </View>
                ) : null}
              </View>
              {!resolved ? (
                <Button small variant="ghost" title="Resolve" icon="check" onPress={() => resolveOne(p.id)} />
              ) : null}
            </Row>
            <Spacer size={spacing.sm} />
            <Button
              small
              variant="secondary"
              title="Open farm"
              icon="chevron-right"
              onPress={() => router.push(`/(admin)/farm/${p.farmId}` as never)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
