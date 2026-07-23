import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { Header } from '@/components/Header';
import { Badge, Card, EmptyState, Row, Screen, Txt } from '@/components/ui';
import { repo } from '@/data';
import { relativeTime } from '@/lib/date';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { useUserMap } from '@/stores/useUsers';
import { spacing } from '@/theme';

export default function Review() {
  const { data: subs } = useRepoQuery(() => repo.listSubmissions(), [], ['submissions']);
  const users = useUserMap();
  const pending = (subs ?? []).filter((s) => s.status === 'submitted' || s.status === 'under_review');

  return (
    <Screen>
      <Header title="Review queue" subtitle={`${pending.length} awaiting review`} />
      <FlatList
        style={{ flex: 1 }}
        data={pending}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/(admin)/submission/${item.id}` as never)} style={{ marginBottom: spacing.sm }}>
            <Row justify="space-between">
              <Txt variant="subtitle">{item.glowFarmId}</Txt>
              <Badge label={`${item.photoIds.length} photos`} tone="info" />
            </Row>
            <Txt variant="caption">
              by {users[item.submittedBy]?.name ?? item.submittedBy} · {relativeTime(item.submittedAt)}
            </Txt>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="✅" title="Review queue is clear" subtitle="No submissions are waiting." />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      />
    </Screen>
  );
}
