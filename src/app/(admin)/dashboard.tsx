import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlowIcon, type IconName } from '@/components/brand/GlowIcon';
import { GlowLockup } from '@/components/brand/GlowLogo';
import { Header } from '@/components/Header';
import { SyncChip } from '@/components/SyncChip';
import { Button, Card, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { isPreInstallDone } from '@/domain/status';
import { isOverdue } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, fontFamily, spacing, tabularNums } from '@/theme';

/**
 * The first screen an administrator sees.
 *
 * It used to carry 13 stat tiles, two segmented controls, an auto-expanded
 * per-worker section and a per-state progress list — around 30 stacked blocks,
 * most of them numbers with nowhere to go. Field feedback: too busy.
 *
 * So this page answers exactly one question: **what needs you right now?** Each
 * row disappears at zero, which means an ordinary morning shows almost nothing —
 * that emptiness is the feature. The numbers all still exist, on Progress; the
 * per-worker breakdown lives on People.
 */

interface Item {
  key: string;
  count: number;
  icon: IconName;
  label: string;
  /** Only the genuinely time-sensitive rows are tinted; everything can't be urgent. */
  urgent?: boolean;
  href: string;
}

export default function Dashboard() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const { data: submissions } = useRepoQuery(() => repo.listSubmissions(), [], ['submissions']);
  const { data: problems } = useRepoQuery(() => repo.listProblems({ resolved: false }), [], ['problems']);
  const { data: users } = useRepoQuery(() => repo.listUsers(), [], ['users']);

  const f = farms ?? [];
  const subs = submissions ?? [];
  const probs = problems ?? [];

  const items = useMemo<Item[]>(() => {
    const rows: Item[] = [
      {
        key: 'review',
        count: subs.filter((s) => s.status === 'submitted' || s.status === 'under_review').length,
        icon: 'review',
        label: 'waiting on your review',
        urgent: true,
        href: '/(admin)/review',
      },
      {
        key: 'problems',
        count: probs.length,
        icon: 'alert',
        label: 'problems reported from the field',
        urgent: true,
        href: '/(admin)/problems',
      },
      {
        key: 'overdue',
        count: f.filter((x) => isOverdue(x.scheduledDate, isPreInstallDone(x.preInstallStatus))).length,
        icon: 'clock',
        label: 'farms past their scheduled date',
        urgent: true,
        href: '/(admin)/farms?preset=overdue',
      },
      {
        key: 'retakes',
        count: f.filter((x) => x.preInstallStatus === 'retake_required').length,
        icon: 'retake',
        label: 'retakes not reshot yet',
        href: '/(admin)/farms?preset=retakes',
      },
      {
        key: 'unassigned',
        count: f.filter(
          (x) =>
            !x.assignedPhotographerId &&
            (x.preInstallStatus === 'ready_for_assignment' || x.preInstallStatus === 'not_ready'),
        ).length,
        icon: 'assign',
        label: 'farms with nobody assigned',
        href: '/(admin)/assignments',
      },
      {
        key: 'nopin',
        count: f.filter((x) => !x.location).length,
        icon: 'pin',
        label: 'farms with no map pin — they can’t be routed',
        href: '/(admin)/farms?preset=nopin',
      },
    ];
    return rows.filter((r) => r.count > 0);
  }, [f, subs, probs]);

  const totals = useMemo(() => {
    const complete = f.filter((x) => isPreInstallDone(x.preInstallStatus)).length;
    const inProgress = f.filter((x) => x.assignedPhotographerId && !isPreInstallDone(x.preInstallStatus)).length;
    return { total: f.length, inProgress, complete };
  }, [f]);

  // A brand-new workspace has no farms and no crew. Point at the two things
  // that have to happen before anything else works, rather than a blank page.
  const firstRun = f.length === 0;
  const alone = (users ?? []).length <= 1;

  return (
    <Screen scroll>
      <View style={{ marginBottom: spacing.lg }}>
        <GlowLockup height={22} />
      </View>
      <Header eyebrow="Overview" title="Field Operations" subtitle={user?.name} right={<SyncChip />} />

      {firstRun ? (
        <Card>
          <Txt variant="heading">Let&rsquo;s get your farms in</Txt>
          <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            Nothing has been added yet. Import your farm list from a spreadsheet, then add the
            photographers and installers who&rsquo;ll be working them.
          </Txt>
          <Spacer size={spacing.lg} />
          <Row gap={spacing.sm} wrap>
            <Button title="Import farms" icon="upload" onPress={() => router.push('/(admin)/import')} />
            <Button
              title={alone ? 'Add your people' : 'People'}
              icon="user"
              variant="secondary"
              onPress={() => router.push('/(admin)/people' as never)}
            />
          </Row>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <Row gap={spacing.md}>
            <GlowIcon name="check" size={22} color={colors.successText} />
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle">Nothing needs you right now</Txt>
              <Txt variant="caption">
                No reviews waiting, no problems reported, nothing overdue.
              </Txt>
            </View>
          </Row>
        </Card>
      ) : (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong }}>
          {items.map((it) => (
            <Pressable
              key={it.key}
              onPress={() => router.push(it.href as never)}
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
                <Txt
                  style={[
                    styles.count,
                    { color: it.urgent ? colors.dangerText : colors.text },
                  ]}
                >
                  {it.count}
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="body">{it.label}</Txt>
                </View>
                <GlowIcon name={it.icon} size={17} color={colors.textFaint} />
                <GlowIcon name="chevron-right" size={15} color={colors.textFaint} />
              </Row>
            </Pressable>
          ))}
        </View>
      )}

      {!firstRun ? (
        <>
          <Spacer size={spacing.xl} />
          <Row gap={spacing.xl} wrap>
            <Figure value={totals.total} label="Farms" />
            <Figure value={totals.inProgress} label="In progress" />
            <Figure value={totals.complete} label="Complete" />
          </Row>
          <Spacer size={spacing.md} />
          <Txt
            variant="label"
            color={colors.brand}
            onPress={() => router.push('/(admin)/progress' as never)}
          >
            See all the numbers
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Txt style={styles.figure}>{value}</Txt>
      <Txt variant="overline">{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    fontFamily: fontFamily.sansBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -1,
    minWidth: 42,
    ...tabularNums,
  },
  figure: {
    fontFamily: fontFamily.sansBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.2,
    color: colors.brand,
    ...tabularNums,
  },
});
