import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { FarmCard } from '@/components/FarmCard';
import { Header } from '@/components/Header';
import { Button, EmptyState, Field, Screen, SegmentedControl, Spacer } from '@/components/ui';
import { repo } from '@/data';
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

const DONE = ['approved', 'complete'];

export default function AdminFarms() {
  const params = useLocalSearchParams<{ preset?: string }>();
  const initial = (params.preset as Preset) ?? 'all';
  const [preset, setPreset] = useState<Preset>(PRESETS.some((p) => p.value === initial) ? initial : 'all');
  const [q, setQ] = useState('');
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
  const users = useUserMap();

  const list = useMemo(() => {
    let arr = farms ?? [];
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter((f) => `${f.name} ${f.address} ${f.glowFarmId}`.toLowerCase().includes(s));
    }
    switch (preset) {
      case 'unassigned':
        arr = arr.filter((f) => !f.assignedPhotographerId && (f.preInstallStatus === 'ready_for_assignment' || f.preInstallStatus === 'not_ready'));
        break;
      case 'assigned':
        arr = arr.filter((f) => f.assignedPhotographerId && !DONE.includes(f.preInstallStatus));
        break;
      case 'submitted':
        arr = arr.filter((f) => f.preInstallStatus === 'photos_submitted' || f.preInstallStatus === 'under_review');
        break;
      case 'retakes':
        arr = arr.filter((f) => f.preInstallStatus === 'retake_required');
        break;
      case 'overdue':
        arr = arr.filter((f) => isOverdue(f.scheduledDate, DONE.includes(f.preInstallStatus)));
        break;
      case 'problems':
        arr = arr.filter((f) => ['unable_to_access', 'address_problem', 'customer_contact_required'].includes(f.preInstallStatus));
        break;
      case 'approved':
        arr = arr.filter((f) => DONE.includes(f.preInstallStatus));
        break;
    }
    return arr;
  }, [farms, q, preset]);

  return (
    <Screen>
      <Header
        title="Farms"
        subtitle={`${list.length} shown`}
        right={<Button small title="Import" icon="⬆️" onPress={() => router.push('/(admin)/import')} />}
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
        ListEmptyComponent={<EmptyState icon="🌾" title="No farms match" subtitle="Try a different filter or search." />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
