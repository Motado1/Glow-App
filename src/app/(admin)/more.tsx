import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GlowLockup } from '@/components/brand/GlowLogo';
import { Header } from '@/components/Header';
import { MenuList } from '@/components/MenuList';
import { Button, Card, Divider, IconLine, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { ROLE_LABEL } from '@/domain/permissions';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, spacing } from '@/theme';

type Confirm = 'erase' | 'sample' | null;

/**
 * The admin menu.
 *
 * This screen used to be a notifications inbox and a problems queue with no
 * links out of it — everything else in the app was reachable only from a button
 * on some other tab, and Import was hidden behind exactly one. Those lists now
 * have their own screens and this is what its name always implied: a way to get
 * to them.
 */
export default function More() {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const { data: notifications } = useRepoQuery(
    () => (user ? repo.listNotifications(user.id) : Promise.resolve([])),
    [user?.id],
    ['notifications'],
  );
  const { data: problems } = useRepoQuery(() => repo.listProblems({ resolved: false }), [], ['problems']);
  const { data: users } = useRepoQuery(() => repo.listUsers(), [], ['users']);
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);

  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const activePeople = (users ?? []).filter((u) => u.active).length;

  async function run(kind: Exclude<Confirm, null>) {
    setBusy(true);
    if (kind === 'erase') await repo.reset();
    else await repo.loadSampleData();
    setBusy(false);
    setConfirm(null);
  }

  async function doSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <Screen scroll>
      <Header eyebrow={user ? ROLE_LABEL[user.role] : undefined} title={user?.name ?? 'Account'} />

      <MenuList
        items={[
          {
            icon: 'user',
            label: 'People',
            detail: `${activePeople} active · add photographers and installers`,
            href: '/(admin)/people',
          },
          {
            icon: 'upload',
            label: 'Import farms',
            detail: 'Load a farm list from a spreadsheet',
            href: '/(admin)/import',
          },
          {
            icon: 'alerts',
            label: 'Alerts',
            detail: unread ? `${unread} unread` : 'Nothing new',
            badge: unread || undefined,
            href: '/(admin)/notifications',
          },
          {
            icon: 'alert',
            label: 'Problems',
            detail: (problems ?? []).length ? `${(problems ?? []).length} open` : 'None open',
            badge: (problems ?? []).length || undefined,
            href: '/(admin)/problems',
          },
          {
            icon: 'dashboard',
            label: 'Progress',
            detail: 'Every count, by phase, worker and state',
            href: '/(admin)/progress',
          },
        ]}
      />

      <Spacer size={spacing.xl} />
      <Txt variant="overline">Data</Txt>
      <Spacer size={spacing.sm} />

      {confirm ? (
        <Card style={{ borderWidth: 1, borderColor: colors.dangerText }}>
          <IconLine icon="alert" variant="subtitle" size={15} color={colors.dangerText}>
            {confirm === 'erase' ? 'Erase everything?' : 'Replace everything with sample data?'}
          </IconLine>
          <Spacer size={spacing.sm} />
          <Txt variant="body" color={colors.textMuted}>
            {confirm === 'erase'
              ? `This deletes all ${(farms ?? []).length} farms, their photos, and the whole history. Your account stays; everyone else is removed. It cannot be undone.`
              : `This deletes all ${(farms ?? []).length} farms and replaces them with a made-up dataset for demonstrating the app. Anything real goes with it.`}
          </Txt>
          <Spacer size={spacing.lg} />
          <Row gap={spacing.sm} wrap>
            <Button
              title={confirm === 'erase' ? 'Erase everything' : 'Load sample data'}
              variant="danger"
              onPress={() => run(confirm)}
              loading={busy}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setConfirm(null)} />
          </Row>
        </Card>
      ) : (
        <>
          <Button
            title="Load sample data"
            variant="secondary"
            icon="box"
            onPress={() => setConfirm('sample')}
            full
          />
          <Txt variant="caption" style={{ marginTop: spacing.xs }}>
            Fills the app with made-up farms so you can show someone how it works. Replaces whatever is
            there now.
          </Txt>
          <Spacer size={spacing.md} />
          <Button title="Erase all data" variant="ghost" icon="reset" onPress={() => setConfirm('erase')} full />
        </>
      )}

      <Divider />
      <Button title="Sign out" variant="ghost" icon="signout" onPress={doSignOut} full />

      <Spacer size={spacing.xl} />
      <Row gap={spacing.sm} justify="center" style={{ opacity: 0.5 }}>
        <GlowLockup height={14} color={colors.textFaint} />
      </Row>
      <Spacer size={spacing.sm} />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Txt variant="caption" align="center">
          Everything is stored on this device only. It is not backed up and the crew&rsquo;s phones
          can&rsquo;t see it yet.
        </Txt>
      </View>
    </Screen>
  );
}
