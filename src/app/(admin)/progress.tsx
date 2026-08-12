import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WorkerSection } from '@/components/admin/WorkerSection';
import { Header } from '@/components/Header';
import {
  Card,
  Divider,
  EmptyState,
  Row,
  Screen,
  SegmentedControl,
  Spacer,
  Stat,
  StatGrid,
  Txt,
} from '@/components/ui';
import { repo } from '@/data';
import { isPreInstallDone } from '@/domain/status';
import type { WorkRole } from '@/domain/types';
import { WORKER_FILTERS, type WorkerFilter } from '@/features/assignments/summarize';
import { isOverdue, todayIso } from '@/lib/date';
import { useAssignmentSummaries } from '@/stores/useAssignmentSummaries';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

/**
 * Every number, on the screen you go to when you want numbers.
 *
 * All of this used to be the landing page. It's the same content — it just
 * isn't the first thing anymore.
 */
export default function Progress() {
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const { data: submissions } = useRepoQuery(() => repo.listSubmissions(), [], ['submissions']);
  const { data: problems } = useRepoQuery(() => repo.listProblems({ resolved: false }), [], ['problems']);

  const [role, setRole] = useState<WorkRole>('photographer');
  const [filter, setFilter] = useState<WorkerFilter>('all');
  const summaries = useAssignmentSummaries(farms, role);

  const f = farms ?? [];
  const subs = submissions ?? [];
  const probs = problems ?? [];
  const today = todayIso();

  const stats = useMemo(() => {
    const needsPre = f.filter((x) => x.preInstallStatus === 'ready_for_assignment' || x.preInstallStatus === 'not_ready').length;
    const assigned = f.filter((x) => x.assignedPhotographerId && !isPreInstallDone(x.preInstallStatus)).length;
    const awaitingReview = subs.filter((s) => s.status === 'submitted' || s.status === 'under_review').length;
    const retakes = f.filter((x) => x.preInstallStatus === 'retake_required').length;
    const overdue = f.filter((x) => isOverdue(x.scheduledDate, isPreInstallDone(x.preInstallStatus))).length;
    const approvedToday = f.filter((x) => x.completionDate?.slice(0, 10) === today).length;
    const traveling = new Set(
      f.filter((x) => x.assignedPhotographerId && x.preInstallStatus === 'in_progress').map((x) => x.assignedPhotographerId),
    ).size;
    const ptoReached = f.filter((x) => x.ptoStatus === 'reached' && x.boxInstallStatus !== 'complete').length;
    const readyForInstall = f.filter((x) => x.boxInstallStatus === 'ready_for_assignment').length;
    const installing = f.filter((x) => x.assignedInstallerId && x.boxInstallStatus !== 'complete').length;
    const notConnected = f.filter((x) => x.boxInstallStatus === 'connectivity_failed').length;
    const fieldComplete = f.filter((x) => x.overallStatus === 'field_ops_complete').length;
    return { needsPre, assigned, awaitingReview, retakes, overdue, approvedToday, traveling, ptoReached, readyForInstall, installing, notConnected, fieldComplete };
  }, [f, subs, today]);

  const byState = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const x of f) {
      // Imported coordinate-only farms may have no state yet.
      const key = x.state || 'Unspecified';
      const e = map.get(key) ?? { total: 0, done: 0 };
      e.total++;
      if (isPreInstallDone(x.preInstallStatus)) e.done++;
      map.set(key, e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [f]);

  if (f.length === 0) {
    return (
      <Screen scroll>
        <Header eyebrow="Reporting" title="Progress" onBack={() => router.back()} />
        <EmptyState
          title="Nothing to measure yet"
          subtitle="Once farms are imported and assigned, this is where the counts live."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header eyebrow="Reporting" title="Progress" subtitle={`${f.length} farms`} onBack={() => router.back()} />

      <Txt variant="overline">Pre-install photography</Txt>
      <Spacer size={spacing.sm} />
      <StatGrid>
        <Stat label="Need pre-install photos" value={stats.needsPre} tone="info" onPress={() => router.push('/(admin)/farms?preset=unassigned' as never)} />
        <Stat label="Currently assigned" value={stats.assigned} tone="progress" onPress={() => router.push('/(admin)/farms?preset=assigned' as never)} />
        <Stat label="Awaiting review" value={stats.awaitingReview} tone="warning" onPress={() => router.push('/(admin)/review')} />
        <Stat label="Retakes required" value={stats.retakes} tone="danger" onPress={() => router.push('/(admin)/farms?preset=retakes' as never)} />
        <Stat label="Overdue" value={stats.overdue} tone="danger" onPress={() => router.push('/(admin)/farms?preset=overdue' as never)} />
        <Stat label="Approved today" value={stats.approvedToday} tone="success" />
        <Stat label="Photographers traveling" value={stats.traveling} tone="info" />
        <Stat label="Open problems" value={probs.length} tone="danger" onPress={() => router.push('/(admin)/problems' as never)} />
      </StatGrid>

      <Spacer size={spacing.lg} />
      <Txt variant="overline">Box installation</Txt>
      <Spacer size={spacing.sm} />
      <StatGrid>
        <Stat label="PTO reached" value={stats.ptoReached} tone="info" />
        <Stat label="Ready for install" value={stats.readyForInstall} tone="progress" onPress={() => router.push('/(admin)/assignments')} />
        <Stat label="Installs in progress" value={stats.installing} tone="progress" />
        <Stat label="Installed, not connected" value={stats.notConnected} tone="danger" />
        <Stat label="Field ops complete" value={stats.fieldComplete} tone="success" />
      </StatGrid>

      <Divider />
      <Txt variant="overline">By {role === 'installer' ? 'installer' : 'photographer'}</Txt>
      <Spacer size={spacing.sm} />
      <SegmentedControl
        options={[
          { value: 'photographer', label: 'Photographers', icon: 'camera' },
          { value: 'installer', label: 'Installers', icon: 'box' },
        ]}
        value={role}
        onChange={(r) => setRole(r as WorkRole)}
      />
      <Spacer size={spacing.sm} />
      <Txt variant="label">Show</Txt>
      <Spacer size={spacing.xs} />
      <SegmentedControl options={WORKER_FILTERS} value={filter} onChange={setFilter} />
      <Spacer size={spacing.md} />

      {summaries.length === 0 ? (
        <EmptyState
          title={`No ${role === 'installer' ? 'installers' : 'photographers'} assigned`}
          subtitle="Assign farms from the Assign tab and they'll show up here."
        />
      ) : (
        summaries.map((s, i) => <WorkerSection key={s.userId} summary={s} filter={filter} defaultOpen={i === 0} />)
      )}

      <Divider />
      <Txt variant="overline">By state</Txt>
      <Spacer size={spacing.sm} />
      {byState.map(([state, v]) => {
        const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
        return (
          <Card key={state} style={{ marginBottom: spacing.sm }}>
            <Row justify="space-between">
              <Txt variant="subtitle">{state}</Txt>
              <Txt variant="caption">
                {v.done}/{v.total} complete · {pct}%
              </Txt>
            </Row>
            <View style={{ height: 8, backgroundColor: colors.surfaceSunken, borderRadius: radius.pill, marginTop: spacing.sm, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 8, backgroundColor: colors.accent }} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
