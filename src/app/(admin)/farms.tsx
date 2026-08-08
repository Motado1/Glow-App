import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { FarmCard } from '@/components/FarmCard';
import { Header } from '@/components/Header';
import { Button, EmptyState, Field, Screen, SegmentedControl, Spacer } from '@/components/ui';
import { repo } from '@/data';
import { isPreInstallDone } from '@/domain/status';
import { isOverdue } from '@/lib/date';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { useUserMap } from '@/stores/useUsers';
import { spacing } from '@/theme';

type Preset = 'all' | 'unassigned' | 'assigned' | 'submitted' | 'retakes' | 'overdue' | 'problems' | 'approved';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'retakes', label: 'Retakes' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'problems', label: 'Problems' },
  { value: 'approved', label: 'Approved' },
];

export default function AdminFarms() {
  const params = useLocalSearchParams<{ preset?: string; worker?: string }>();
  const initial = (params.preset as Preset) ?? 'all';
  const worker = params.worker;
  const [preset, setPreset] = useState<Preset>(PRESETS.some((p) => p.value === initial) ? initial : 'all');
  const [q, setQ] = useState('');
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const users = useUserMap();

  const list = useMemo(() => {
    let arr = farms ?? [];
    if (worker) {
      arr = arr.filter((f) => f.assignedPhotographerId === worker || f.assignedInstallerId === worker);
    }
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter((f) => `${f.name} ${f.address} ${f.glowFarmId}`.toLowerCase().includes(s));
    }
    switch (preset) {
      case 'unassigned':
        arr = arr.filter((f) => !f.assignedPhotographerId && (f.preInstallStatus === 'ready_for_assignment' || f.preInstallStatus === 'not_ready'));
        break;
      case 'assigned':
        arr = arr.filter((f) => f.assignedPhotographerId && !isPreInstallDone(f.preInstallStatus));
        break;
      case 'submitted':
        arr = arr.filter((f) => f.preInstallStatus === 'photos_submitted' || f.preInstallStatus === 'under_review');
        break;
      case 'retakes':
        arr = arr.filter((f) => f.preInstallStatus === 'retake_required');
        break;
      case 'overdue':
        arr = arr.filter((f) => isOverdue(f.scheduledDate, isPreInstallDone(f.preInstallStatus)));
        break;
      case 'problems':
        arr = arr.filter((f) => ['unable_to_access', 'address_problem', 'customer_contact_required'].includes(f.preInstallStatus));
        break;
      case 'approved':
        arr = arr.filter((f) => isPreInstallDone(f.preInstallStatus));
        break;
    }
    return arr;
  }, [farms, q, preset]);

  return (
    <Screen>
      <Header
        eyebrow="Records"
        title="Farms"
        subtitle={`${list.length} shown`}
        right={<Button small title="Import" icon="upload" onPress={() => router.push('/(admin)/import')} />}
      />
      <Field value={q} onChangeText={setQ} placeholder="Search name, address, or Glow ID" />
      <Spacer size={spacing.sm} />
      <SegmentedControl options={PRESETS} value={preset} onChange={setPreset} />
      <Spacer size={spacing.sm} />
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FarmCard
            farm={item}
            assigneeName={item.assignedPhotographerId ? users[item.assignedPhotographerId]?.name : undefined}
            onPress={() => router.push(`/(admin)/farm/${item.id}` as never)}
          />
        )}
        ListEmptyComponent={<EmptyState title="No farms in this view" subtitle="Widen the filter, clear the search, or import a new list." />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
