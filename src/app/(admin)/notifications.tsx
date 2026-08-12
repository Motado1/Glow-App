import { router } from 'expo-router';
import { Header } from '@/components/Header';
import { Badge, Button, Card, EmptyState, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { relativeTime } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

/**
 * The admin inbox. Field workers already had a top-level Alerts tab; the admin
 * side had the same content buried inside "More" with a hard cap of 12 and no
 * way to see anything older. Both halves of the app now work the same way.
 */
export default function Notifications() {
  const user = useCurrentUser();
  const { data: notifications, refresh } = useRepoQuery(
    () => (user ? repo.listNotifications(user.id) : Promise.resolve([])),
    [user?.id],
    ['notifications'],
  );

  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  async function markAll() {
    if (!user) return;
    await repo.markAllNotificationsRead(user.id);
    refresh();
  }

  return (
    <Screen scroll>
      <Header
        eyebrow="Inbox"
        title="Alerts"
        subtitle={`${unread} unread`}
        onBack={() => router.back()}
        right={unread ? <Button small variant="ghost" title="Mark all read" onPress={markAll} /> : undefined}
      />

      {list.length === 0 ? (
        <EmptyState
          title="No alerts"
          subtitle="Submissions, reported problems and completed installs show up here."
        />
      ) : (
        list.map((n) => (
          <Card
            key={n.id}
            onPress={n.farmId ? () => router.push(`/(admin)/farm/${n.farmId}` as never) : undefined}
            style={{ marginBottom: spacing.sm, opacity: n.read ? 0.6 : 1 }}
          >
            <Row justify="space-between" gap={spacing.sm}>
              <Txt variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                {n.title}
              </Txt>
              {!n.read ? <Badge label="New" tone="info" /> : null}
            </Row>
            <Spacer size={spacing.xs} />
            <Txt variant="caption">
              {n.body} · {relativeTime(n.createdAt)}
            </Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
