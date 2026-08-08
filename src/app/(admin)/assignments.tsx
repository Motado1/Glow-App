import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Header } from '@/components/Header';
import { GlowIcon } from '@/components/brand/GlowIcon';
import { Button, Card, Divider, EmptyState, IconLine, Row, Screen, SegmentedControl, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { isBoxInstallDone, isPreInstallDone } from '@/domain/status';
import type { WorkRole } from '@/domain/types';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, spacing } from '@/theme';

const PRE_READY = ['ready_for_assignment', 'not_ready'];

export default function Assignments() {
  const admin = useCurrentUser();
  const { data: farms, refresh } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const { data: users } = useRepoQuery(() => repo.listUsers(), []);

  const [mode, setMode] = useState<WorkRole>('photographer');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [workerId, setWorkerId] = useState('');
  const [busy, setBusy] = useState(false);

  const isInstaller = mode === 'installer';
  const workers = (users ?? []).filter((u) => u.role === mode && u.active);
  const activeWorker = workerId && workers.some((w) => w.id === workerId) ? workerId : workers[0]?.id || '';

  const unassigned = useMemo(
    () =>
      (farms ?? []).filter((f) =>
        isInstaller
          ? !f.assignedInstallerId && f.boxInstallStatus === 'ready_for_assignment'
          : !f.assignedPhotographerId && PRE_READY.includes(f.preInstallStatus),
      ),
    [farms, isInstaller],
  );
  const states = useMemo(() => [...new Set(unassigned.map((f) => f.state))], [unassigned]);

  const summaries = useMemo(() => {
    const map = new Map<string, { count: number; done: number }>();
    for (const f of farms ?? []) {
      const uid = isInstaller ? f.assignedInstallerId : f.assignedPhotographerId;
      if (!uid) continue;
      const e = map.get(uid) ?? { count: 0, done: 0 };
      e.count++;
      const done = isInstaller ? isBoxInstallDone(f.boxInstallStatus) : isPreInstallDone(f.preInstallStatus);
      if (done) e.done++;
      map.set(uid, e);
    }
    return [...map.entries()];
  }, [farms, isInstaller]);

  function switchMode(m: WorkRole) {
    setMode(m);
    setSelected(new Set());
    setWorkerId('');
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectState(state: string) {
    setSelected(new Set(unassigned.filter((f) => f.state === state).map((f) => f.id)));
  }
  async function assign() {
    if (!activeWorker || selected.size === 0) return;
    setBusy(true);
    await repo.assignFarms([...selected], activeWorker, mode, admin?.id ?? 'system');
    setSelected(new Set());
    setBusy(false);
    refresh();
  }
  const nameOf = (id: string) => (users ?? []).find((u) => u.id === id)?.name ?? 'Unknown';

  return (
    <Screen scroll>
      <Header
        eyebrow="Dispatch"
        title="Assign work"
        subtitle={`${unassigned.length} ${isInstaller ? 'ready for install' : 'waiting on a photographer'}`}
      />

      <SegmentedControl
        options={[
          { value: 'photographer', label: 'Photography', icon: 'camera' },
          { value: 'installer', label: 'Box install', icon: 'box' },
        ]}
        value={mode}
        onChange={switchMode}
      />
      <Spacer size={spacing.sm} />

      {workers.length > 0 ? (
        <>
          <Txt variant="label">Assign to</Txt>
          <Spacer size={spacing.xs} />
          <SegmentedControl
            options={workers.map((p) => ({ value: p.id, label: p.name.split(' ')[0] }))}
            value={activeWorker}
            onChange={setWorkerId}
          />
          <Spacer size={spacing.sm} />
          {states.length > 0 ? (
            <Row wrap gap={spacing.xs}>
              <Txt variant="label">Quick select:</Txt>
              {states.map((s) => (
                <Pressable key={s} onPress={() => selectState(s)}>
                  <Txt variant="label" color={colors.brand}>
                    All {s}
                  </Txt>
                </Pressable>
              ))}
            </Row>
          ) : null}
          <Spacer size={spacing.sm} />
          <Button
            title={selected.size ? `Assign ${selected.size} to ${nameOf(activeWorker).split(' ')[0]}` : 'Select farms to assign'}
            onPress={assign}
            loading={busy}
            disabled={selected.size === 0}
            full
            icon="assign"
          />
        </>
      ) : (
        <Txt variant="caption">No active {mode === 'installer' ? 'installers' : 'photographers'} to assign to.</Txt>
      )}

      <Divider />

      {unassigned.length === 0 ? (
        <EmptyState
          title="Nothing to assign"
          subtitle={isInstaller ? 'No farms are waiting for a box install.' : 'Every ready farm has a photographer.'}
        />
      ) : (
        unassigned.map((f) => {
          const on = selected.has(f.id);
          return (
            <Card key={f.id} onPress={() => toggle(f.id)} style={{ marginBottom: spacing.sm, borderColor: colors.brand, borderWidth: on ? 2 : 0 }}>
              <Row gap={spacing.md}>
                <GlowIcon name={on ? 'checkbox-on' : 'checkbox-off'} size={22} color={on ? colors.brand : colors.borderStrong} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle" numberOfLines={1}>
                    {f.name}
                  </Txt>
                  <Txt variant="caption" numberOfLines={1}>
                    {f.glowFarmId} · {f.state} · {f.address}
                  </Txt>
                </View>
              </Row>
            </Card>
          );
        })
      )}

      {summaries.length > 0 ? (
        <>
          <Divider />
          <Txt variant="overline">Current {isInstaller ? 'installers' : 'photographers'}</Txt>
          <Spacer size={spacing.sm} />
          {summaries.map(([uid, e]) => (
            <Card key={uid} style={{ marginBottom: spacing.sm }}>
              <Row justify="space-between">
                <IconLine icon="user" variant="subtitle" size={15} color={colors.text}>
                  {nameOf(uid)}
                </IconLine>
                <Txt variant="label">
                  {e.done}/{e.count} complete
                </Txt>
              </Row>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
