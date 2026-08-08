import { View } from 'react-native';
import { boxInstallStatus, fieldPreInstallStatus, preInstallStatus } from '@/components/statusHelpers';
import { Badge, Card, IconLine, Row, StatusPill, Txt } from '@/components/ui';
import { isFieldRole } from '@/domain/permissions';
import { isBoxInstallDone, isPreInstallDone } from '@/domain/status';
import type { Farm } from '@/domain/types';
import { formatDate, isOverdue } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { colors, fontSize, spacing } from '@/theme';

export function FarmCard({
  farm,
  onPress,
  assigneeName,
  rightBadge,
  phase = 'pre_install',
  audience,
}: {
  farm: Farm;
  onPress?: () => void;
  assigneeName?: string;
  rightBadge?: { label: string; tone: 'neutral' | 'info' | 'progress' | 'warning' | 'danger' | 'success' };
  phase?: 'pre_install' | 'box_install';
  /** Defaults to the signed-in role, so a field screen can't leak a problem status by omission. */
  audience?: 'admin' | 'field';
}) {
  const user = useCurrentUser();
  const forField = audience ? audience === 'field' : !!user && isFieldRole(user.role);
  const box = phase === 'box_install';
  const done = box ? isBoxInstallDone(farm.boxInstallStatus) : isPreInstallDone(farm.preInstallStatus);
  const overdue = box ? false : isOverdue(farm.scheduledDate, done);
  const st = box
    ? boxInstallStatus(farm.boxInstallStatus ?? 'ready_for_assignment')
    : forField
      ? fieldPreInstallStatus(farm.preInstallStatus)
      : preInstallStatus(farm.preInstallStatus);

  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.sm }}>
      <Row justify="space-between" align="flex-start" gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          {/* The Glow ID anchors the card: it's what gets read out over the
              phone and typed into the Hub, so it leads, set in mono the way
              the site sets its values. The name is the headline under it. */}
          <Txt variant="mono" color={colors.textFaint} style={{ fontSize: fontSize.xs }}>
            {farm.glowFarmId}
          </Txt>
          <Txt variant="subtitle" numberOfLines={1}>
            {farm.name}
          </Txt>
          <Txt variant="caption" numberOfLines={1}>
            {farm.address}
          </Txt>
        </View>
        {rightBadge ? <Badge label={rightBadge.label} tone={rightBadge.tone} /> : overdue ? <Badge label="Overdue" tone="danger" /> : null}
      </Row>
      <Row justify="space-between" style={{ marginTop: spacing.sm }} gap={spacing.sm} wrap>
        <StatusPill label={st.label} tone={st.tone} />
        <Row gap={spacing.md}>
          {assigneeName ? <IconLine icon="user">{assigneeName}</IconLine> : null}
          {farm.scheduledDate ? <IconLine icon="calendar">{formatDate(farm.scheduledDate)}</IconLine> : null}
        </Row>
      </Row>
    </Card>
  );
}
