import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { FarmCard } from '@/components/FarmCard';
import { Header } from '@/components/Header';
import { SyncChip } from '@/components/SyncChip';
import { EmptyState, Screen, SegmentedControl, Spacer } from '@/components/ui';
import { repo } from '@/data';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

type Filter = 'all' | 'incomplete' | 'completed' | 'problem' | 'retake';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'completed', label: 'Completed' },
  { value: 'problem', label: 'Problems' },
  { value: 'retake', label: 'Retakes' },
];
const INSTALLER_FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'incomplete', label: 'To install' },
  { value: 'completed', label: 'Complete' },
];
const DONE = ['approved', 'complete'];
const PROBLEMS = ['unable_to_access', 'address_problem', 'customer_contact_required'];

export default function FieldFarms() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);
  const [f, setF] = useState<Filter>('all');
  const isInstaller = user?.role === 'installer';

  const list = useMemo(() => {
    let a = farms ?? [];
    if (isInstaller) {
      if (f === 'completed') a = a.filter((x) => x.boxInstallStatus === 'complete');
      else if (f === 'incomplete') a = a.filter((x) => x.boxInstallStatus !== 'complete');
      return a;
    }
    if (f === 'completed') a = a.filter((x) => DONE.includes(x.preInstallStatus));
    else if (f === 'incomplete') a = a.filter((x) => !DONE.includes(x.preInstallStatus));
    else if (f === 'problem') a = a.filter((x) => PROBLEMS.includes(x.preInstallStatus));
    else if (f === 'retake') a = a.filter((x) => x.preInstallStatus === 'retake_required');
    return a;
  }, [farms, f, isInstaller]);

  return (
    <Screen>
      <Header title={isInstaller ? 'My installations' : 'My farms'} subtitle={`${list.length} shown`} right={<SyncChip />} />
      <SegmentedControl options={isInstaller ? INSTALLER_FILTERS : FILTERS} value={f} onChange={setF} />
      <Spacer size={spacing.sm} />
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <FarmCard
            farm={item}
            phase={isInstaller ? 'box_install' : 'pre_install'}
            onPress={() => router.push((isInstaller ? `/(field)/install/${item.id}` : `/(field)/farm/${item.id}`) as never)}
          />
        )}
        ListEmptyComponent={<EmptyState icon="🌾" title="Nothing here" subtitle="No farms in this filter." />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
