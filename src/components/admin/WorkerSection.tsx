import { router } from 'expo-router';
import { memo, useState } from 'react';
import { View } from 'react-native';
import { FarmCard } from '@/components/FarmCard';
import { Badge, Card, Row, Spacer, Txt } from '@/components/ui';
import type { AssignmentSummary } from '@/domain/types';
import { matchesWorkerFilter, type WorkerFilter } from '@/features/assignments/summarize';
import { colors, spacing } from '@/theme';

const MAX_VISIBLE = 6;

/**
 * One collapsible section per photographer/installer. Collapsed by default so
 * the dashboard stays cheap — the Farms tab is the place for long lists.
 */
export const WorkerSection = memo(function WorkerSection({
  summary,
  filter,
  defaultOpen = false,
}: {
  summary: AssignmentSummary;
  filter: WorkerFilter;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Header counts stay unfiltered on purpose: you can still see "6 overdue"
  // while looking at another slice.
  const shown = summary.farms.filter((f) => matchesWorkerFilter(f, filter, summary.role));
  const visible = shown.slice(0, MAX_VISIBLE);
  const preset = filter === 'all' ? 'assigned' : filter === 'awaiting_review' ? 'submitted' : filter;
  const farmsHref = `/(admin)/farms?preset=${preset}&worker=${summary.userId}`;

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Card onPress={() => setOpen((o) => !o)}>
        <Row justify="space-between" gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" numberOfLines={1}>
              {open ? '▾' : '▸'} 👤 {summary.userName}
            </Txt>
            <Txt variant="caption" numberOfLines={1}>
              {summary.states.join(', ') || 'No state'} · {summary.remaining} remaining
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="subtitle">
              {summary.completed}/{summary.farmCount}
            </Txt>
            <Txt variant="caption">complete</Txt>
          </View>
        </Row>
        <Row gap={spacing.xs} wrap style={{ marginTop: spacing.sm }}>
          {summary.overdue > 0 ? <Badge label={`${summary.overdue} overdue`} tone="danger" /> : null}
          {summary.retakes > 0 ? <Badge label={`${summary.retakes} retakes`} tone="danger" /> : null}
          {summary.awaitingReview > 0 ? (
            <Badge label={`${summary.awaitingReview} awaiting review`} tone="warning" />
          ) : null}
          {summary.overdue === 0 && summary.retakes === 0 && summary.awaitingReview === 0 ? (
            <Badge label="On track" tone="success" />
          ) : null}
        </Row>
      </Card>

      {open ? (
        <View style={{ marginTop: spacing.sm, paddingLeft: spacing.sm }}>
          {shown.length === 0 ? (
            <Txt variant="caption">No farms in this category.</Txt>
          ) : (
            <>
              {visible.map((f) => (
                <FarmCard
                  key={f.id}
                  farm={f}
                  audience="admin"
                  phase={summary.role === 'installer' ? 'box_install' : 'pre_install'}
                  onPress={() => router.push(`/(admin)/farm/${f.id}` as never)}
                />
              ))}
              {shown.length > visible.length ? (
                <Txt
                  variant="label"
                  color={colors.brand}
                  style={{ paddingVertical: spacing.sm }}
                  onPress={() => router.push(farmsHref as never)}
                >
                  View all {shown.length} in Farms →
                </Txt>
              ) : null}
            </>
          )}
          <Spacer size={spacing.xs} />
        </View>
      ) : null}
    </View>
  );
});
