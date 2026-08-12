import { View } from 'react-native';
import { Badge, IconLine, Row, Txt } from '@/components/ui';
import type { CheckIn } from '@/domain/types';
import { formatCheckInDistance, officeLabel, type CheckInVerdict } from '@/features/checkin/classify';
import { relativeTime } from '@/lib/date';
import { colors, spacing } from '@/theme';

/**
 * What the office sees about where a visit happened.
 *
 * Only a genuine off-site visit is flagged. "No GPS" and "no map pin" are shown
 * plainly and left unflagged on purpose — the first is usually a phone setting
 * and the second is a gap in our own data, and dressing either up as a finding
 * would put a photographer under suspicion for something they didn't do.
 */
export function CheckInSummary({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length === 0) {
    return <IconLine icon="pin">No visit recorded for this farm yet.</IconLine>;
  }

  const [latest, ...earlier] = checkIns;
  const { label, flagged } = officeLabel({
    verdict: latest.verdict as CheckInVerdict,
    distanceMiles: latest.distanceMiles,
    withinGeofence: latest.verdict === 'on_site',
  });

  return (
    <View style={{ gap: spacing.xs }}>
      <Row gap={spacing.sm} wrap>
        <Badge
          label={label}
          tone={flagged ? 'danger' : latest.verdict === 'on_site' ? 'success' : 'neutral'}
          icon={latest.verdict === 'on_site' ? 'check' : flagged ? 'alert' : 'pin'}
        />
        <Txt variant="caption">{relativeTime(latest.at)}</Txt>
      </Row>

      {latest.point ? (
        <Txt variant="mono" color={colors.textFaint}>
          {latest.point.lat.toFixed(5)}, {latest.point.lng.toFixed(5)}
          {latest.accuracyMeters != null ? ` · ±${Math.round(latest.accuracyMeters)} m` : ''}
        </Txt>
      ) : null}

      {earlier.length > 0 ? (
        <Txt variant="caption">
          {earlier.length} earlier visit{earlier.length === 1 ? '' : 's'}
          {earlier.some((c) => c.distanceMiles != null)
            ? ` · closest ${formatCheckInDistance(
                Math.min(...earlier.filter((c) => c.distanceMiles != null).map((c) => c.distanceMiles!)),
              )}`
            : ''}
        </Txt>
      ) : null}
    </View>
  );
}
