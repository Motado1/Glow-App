import { View } from 'react-native';
import { preInstallStatus } from '@/components/statusHelpers';
import { Badge, Card, Row, StatusPill, Txt } from '@/components/ui';
import type { Farm } from '@/domain/types';
import { formatDate, isOverdue } from '@/lib/date';
import { spacing } from '@/theme';

export function FarmCard({
  farm,
  onPress,
  assigneeName,
  rightBadge,
}: {
  farm: Farm;
  onPress?: () => void;
  assigneeName?: string;
  rightBadge?: { label: string; tone: 'neutral' | 'info' | 'progress' | 'warning' | 'danger' | 'success' };
}) {
  const done = farm.preInstallStatus === 'approved' || farm.preInstallStatus === 'complete';
  const overdue = isOverdue(farm.scheduledDate, done);
  const st = preInstallStatus(farm.preInstallStatus);
  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.sm }}>
      <Row justify="space-between" align="flex-start" gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" numberOfLines={1}>
            {farm.name}
          </Txt>
          <Txt variant="caption" numberOfLines={1}>
            {farm.glowFarmId} · {farm.address}
          </Txt>
        </View>
        {rightBadge ? <Badge label={rightBadge.label} tone={rightBadge.tone} /> : overdue ? <Badge label="Overdue" tone="danger" /> : null}
      </Row>
      <Row justify="space-between" style={{ marginTop: spacing.sm }} gap={spacing.sm} wrap>
        <StatusPill label={st.label} tone={st.tone} />
        <Row gap={spacing.md}>
          {assigneeName ? <Txt variant="caption">👤 {assigneeName}</Txt> : null}
          {farm.scheduledDate ? <Txt variant="caption">📅 {formatDate(farm.scheduledDate)}</Txt> : null}
        </Row>
      </Row>
    </Card>
  );
}
