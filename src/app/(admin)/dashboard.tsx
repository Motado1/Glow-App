import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { SyncChip } from '@/components/SyncChip';
import { Card, Divider, Row, Screen, Spacer, Stat, Txt } from '@/components/ui';
import { repo } from '@/data';
import { isOverdue, todayIso } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

const DONE = ['approved', 'complete'];

export default function Dashboard() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const { data: submissions } = useRepoQuery(() => repo.listSubmissions(), [], ['submissions']);
  const { data: problems } = useRepoQuery(() => repo.listProblems({ resolved: false }), [], ['problems']);

  const f = farms ?? [];
  const subs = submissions ?? [];
  const probs = problems ?? [];
  const today = todayIso();

  const stats = useMemo(() => {
    const needsPre = f.filter((x) => x.preInstallStatus === 'ready_for_assignment' || x.preInstallStatus === 'not_ready').length;
    const assigned = f.filter((x) => x.assignedPhotographerId && !DONE.includes(x.preInstallStatus)).length;
    const awaitingReview = subs.filter((s) => s.status === 'submitted' || s.status === 'under_review').length;
    const retakes = f.filter((x) => x.preInstallStatus === 'retake_required').length;
    const overdue = f.filter((x) => isOverdue(x.scheduledDate, DONE.includes(x.preInstallStatus))).length;
    const approvedToday = f.filter((x) => x.completionDate?.slice(0, 10) === today).length;
    const traveling = new Set(
      f.filter((x) => x.assignedPhotographerId && x.preInstallStatus === 'in_progress').map((x) => x.assignedPhotographerId),
    ).size;
    return { needsPre, assigned, awaitingReview, retakes, overdue, approvedToday, traveling };
  }, [f, subs, today]);

  const byState = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const x of f) {
      const e = map.get(x.state) ?? { total: 0, done: 0 };
      e.total++;
      if (DONE.includes(x.preInstallStatus)) e.done++;
      map.set(x.state, e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [f]);

  return (
    <Screen scroll>
      <Header
        title={`Hi, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="Pre-install field operations"
        right={<SyncChip />}
      />

      <Row wrap gap={spacing.sm}>
        <Stat label="Need pre-install photos" value={stats.needsPre} tone="info" onPress={() => router.push('/(admin)/farms?preset=unassigned' as never)} />
        <Stat label="Currently assigned" value={stats.assigned} tone="progress" onPress={() => router.push('/(admin)/farms?preset=assigned' as never)} />
        <Stat label="Awaiting review" value={stats.awaitingReview} tone="warning" onPress={() => router.push('/(admin)/review')} />
        <Stat label="Retakes required" value={stats.retakes} tone="danger" onPress={() => router.push('/(admin)/farms?preset=retakes' as never)} />
        <Stat label="Overdue" value={stats.overdue} tone="danger" onPress={() => router.push('/(admin)/farms?preset=overdue' as never)} />
        <Stat label="Approved today" value={stats.approvedToday} tone="success" />
        <Stat label="Photographers traveling" value={stats.traveling} tone="info" />
        <Stat label="Open problems" value={probs.length} tone="danger" onPress={() => router.push('/(admin)/farms?preset=problems' as never)} />
      </Row>

      <Spacer size={spacing.lg} />
      <Txt variant="heading">By state</Txt>
      <Spacer size={spacing.sm} />
      {byState.map(([state, e]) => {
        const pct = e.total ? Math.round((e.done / e.total) * 100) : 0;
        return (
          <Card key={state} style={{ marginBottom: spacing.sm }}>
            <Row justify="space-between">
              <Txt variant="subtitle">{state}</Txt>
              <Txt variant="label">
                {e.done}/{e.total} complete · {pct}%
              </Txt>
            </Row>
            <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, marginTop: spacing.sm, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 8, backgroundColor: colors.brandSoft }} />
            </View>
          </Card>
        );
      })}

      <Divider />
      <Txt variant="caption">
        Local demo data · {f.length} farms. Tap a metric to drill in.
      </Txt>
    </Screen>
  );
}
