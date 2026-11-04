import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { formatWon } from '@dongil/shared';
import { AppText, Card, EmptyState, ErrorState, Loading, PressableScale } from '@/components/ui';
import { useTags } from '@/features/queries';
import { useTheme } from '@/theme/theme';

export default function TagsScreen() {
  const { colors } = useTheme();
  const tags = useTags();

  if (tags.error) return <ErrorState error={tags.error} onRetry={() => tags.refetch()} />;
  if (!tags.data) return <Loading />;
  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={tags.isRefetching} onRefresh={() => tags.refetch()} tintColor={colors.textMuted} />}>
      {tags.data.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="아직 태그가 없어요" description="지출을 기록할 때 태그를 달면 여기에 모여요" />
      ) : (
        <Card>
          {tags.data.map((t) => (
            <PressableScale
              key={t.id}
              onPress={() => router.push({ pathname: '/tag/[id]', params: { id: t.id } })}
              style={styles.row}
              scaleTo={0.98}>
              <AppText numberOfLines={1} style={{ flex: 1 }}>#{t.name}</AppText>
              <AppText variant="caption" tone="textSub">{t.count}건</AppText>
              <AppText variant="label">{formatWon(t.total)}</AppText>
            </PressableScale>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
});
