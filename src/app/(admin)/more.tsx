import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Badge, Button, Card, Divider, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { ROLE_LABEL } from '@/domain/permissions';
import { PROBLEM_TYPE_LABEL } from '@/domain/types';
import { relativeTime } from '@/lib/date';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, spacing } from '@/theme';

export default function More() {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const { data: notifications, refresh: refreshN } = useRepoQuery(
    () => (user ? repo.listNotifications(user.id) : Promise.resolve([])),
    [user?.id],
    ['notifications'],
  );
  const { data: problems, refresh: refreshP } = useRepoQuery(() => repo.listProblems({ resolved: false }), [], ['problems']);

  const unread = (notifications ?? []).filter((n) => !n.read).length;

  async function markAll() {
    if (user) {
      await repo.markAllNotificationsRead(user.id);
      refreshN();
    }
  }
  async function resolve(id: string) {
    await repo.resolveProblem(id);
    refreshP();
  }
  async function resetDemo() {
    await repo.reset();
    refreshN();
    refreshP();
  }
  async function doSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <Screen scroll>
      <Header title="More" subtitle={user ? `${user.name} · ${ROLE_LABEL[user.role]}` : ''} />

      <Row justify="space-between">
        <Txt variant="heading">Notifications{unread ? ` (${unread})` : ''}</Txt>
        {unread ? <Button small variant="ghost" title="Mark all read" onPress={markAll} /> : null}
      </Row>
      <Spacer size={spacing.sm} />
      {(notifications ?? []).length === 0 ? (
        <Txt variant="caption">No notifications.</Txt>
      ) : (
        (notifications ?? []).slice(0, 12).map((n) => (
          <Card
            key={n.id}
            onPress={n.farmId ? () => router.push(`/(admin)/farm/${n.farmId}` as never) : undefined}
            style={{ marginBottom: spacing.sm, opacity: n.read ? 0.6 : 1 }}
          >
            <Row justify="space-between">
              <Txt variant="subtitle">{n.title}</Txt>
              {!n.read ? <Badge label="new" tone="info" /> : null}
            </Row>
            <Txt variant="caption">
              {n.body} · {relativeTime(n.createdAt)}
            </Txt>
          </Card>
        ))
      )}

      <Divider />
      <Txt variant="heading">Open problems ({(problems ?? []).length})</Txt>
      <Spacer size={spacing.sm} />
      {(problems ?? []).length === 0 ? (
        <Txt variant="caption">No open problems.</Txt>
      ) : (
        (problems ?? []).map((p) => (
          <Card key={p.id} style={{ marginBottom: spacing.sm }}>
            <Row justify="space-between" align="flex-start" gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{PROBLEM_TYPE_LABEL[p.type]}</Txt>
                <Txt variant="caption">
                  {p.glowFarmId} · {relativeTime(p.reportedAt)}
                  {p.note ? ` · ${p.note}` : ''}
                </Txt>
              </View>
              <Button small variant="ghost" title="Resolve" onPress={() => resolve(p.id)} />
            </Row>
          </Card>
        ))
      )}

      <Divider />
      <Button title="Reset demo data" variant="secondary" icon="♻️" onPress={resetDemo} full />
      <Spacer size={spacing.sm} />
      <Button title="Sign out" variant="ghost" onPress={doSignOut} full />
      <Spacer />
      <Txt variant="caption" color={colors.textFaint}>
        Glow Field Operations · Pre-install MVP · local demo backend
      </Txt>
    </Screen>
  );
}
