import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { Header } from '@/components/Header';
import { Badge, Button, Card, EmptyState, Row, Screen, Txt } from '@/components/ui';
import { repo } from '@/data';
import { relativeTime } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

export default function Alerts() {
  const user = useCurrentUser();
  const { data: notifications, refresh } = useRepoQuery(
    () => (user ? repo.listNotifications(user.id) : Promise.resolve([])),
    [user?.id],
    ['notifications'],
  );
  const items = notifications ?? [];

  async function markAll() {
    if (user) {
      await repo.markAllNotificationsRead(user.id);
      refresh();
    }
  }

  return (
    <Screen>
      <Header
        title="Alerts"
        subtitle={`${items.filter((n) => !n.read).length} unread`}
        right={<Button small variant="ghost" title="Mark all read" onPress={markAll} />}
      />
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <Card
            onPress={item.farmId ? () => router.push(`/(field)/farm/${item.farmId}` as never) : undefined}
            style={{ marginBottom: spacing.sm, opacity: item.read ? 0.6 : 1 }}
          >
            <Row justify="space-between">
              <Txt variant="subtitle">{item.title}</Txt>
              {!item.read ? <Badge label="new" tone="info" /> : null}
            </Row>
            <Txt variant="caption">
              {item.body} · {relativeTime(item.createdAt)}
            </Txt>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="🔔" title="No alerts" subtitle="You're all caught up." />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      />
    </Screen>
  );
}
