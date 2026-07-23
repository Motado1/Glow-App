import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Header } from '@/components/Header';
import { Button, Card, Divider, EmptyState, Row, Screen, SegmentedControl, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

const READY = ['ready_for_assignment', 'not_ready'];
const DONE = ['approved', 'complete'];

export default function Assignments() {
  const admin = useCurrentUser();
  const { data: farms, refresh } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const { data: users } = useRepoQuery(() => repo.listUsers(), []);
  const photographers = (users ?? []).filter((u) => u.role === 'photographer' && u.active);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [photographerId, setPhotographerId] = useState('');
  const [busy, setBusy] = useState(false);

  const unassigned = useMemo(
    () => (farms ?? []).filter((f) => !f.assignedPhotographerId && READY.includes(f.preInstallStatus)),
    [farms],
  );
  const states = useMemo(() => [...new Set(unassigned.map((f) => f.state))], [unassigned]);
  const activePhotographer = photographerId || photographers[0]?.id || '';

  const summaries = useMemo(() => {
    const map = new Map<string, { count: number; done: number }>();
    for (const f of farms ?? []) {
      if (!f.assignedPhotographerId) continue;
      const e = map.get(f.assignedPhotographerId) ?? { count: 0, done: 0 };
      e.count++;
      if (DONE.includes(f.preInstallStatus)) e.done++;
      map.set(f.assignedPhotographerId, e);
    }
    return [...map.entries()];
  }, [farms]);

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
    if (!activePhotographer || selected.size === 0) return;
    setBusy(true);
    await repo.assignFarms([...selected], activePhotographer, 'photographer', admin?.id ?? 'system');
    setSelected(new Set());
    setBusy(false);
    refresh();
  }

  const nameOf = (id: string) => (users ?? []).find((u) => u.id === id)?.name ?? 'Unknown';

  return (
    <Screen scroll>
      <Header title="Assign work" subtitle={`${unassigned.length} unassigned pre-install`} />

      {photographers.length > 0 ? (
        <>
          <Txt variant="label">Assign to</Txt>
          <Spacer size={spacing.xs} />
          <SegmentedControl
            options={photographers.map((p) => ({ value: p.id, label: p.name.split(' ')[0] }))}
            value={activePhotographer}
            onChange={setPhotographerId}
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
            title={selected.size ? `Assign ${selected.size} to ${nameOf(activePhotographer).split(' ')[0]}` : 'Select farms to assign'}
            onPress={assign}
            loading={busy}
            disabled={selected.size === 0}
            full
            icon="🧭"
          />
        </>
      ) : null}

      <Divider />

      {unassigned.length === 0 ? (
        <EmptyState icon="✅" title="Nothing unassigned" subtitle="Every ready farm has a photographer." />
      ) : (
        unassigned.map((f) => {
          const on = selected.has(f.id);
          return (
            <Card key={f.id} onPress={() => toggle(f.id)} style={{ marginBottom: spacing.sm, borderColor: on ? colors.brand : colors.border, borderWidth: on ? 2 : 1 }}>
              <Row gap={spacing.md}>
                <Txt variant="title">{on ? '☑️' : '⬜️'}</Txt>
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
          <Txt variant="heading">Current assignments</Txt>
          <Spacer size={spacing.sm} />
          {summaries.map(([uid, e]) => (
            <Card key={uid} style={{ marginBottom: spacing.sm }}>
              <Row justify="space-between">
                <Txt variant="subtitle">👤 {nameOf(uid)}</Txt>
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
