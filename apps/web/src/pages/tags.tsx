import { useNavigate } from 'react-router';
import { formatWon } from '@dongil/shared';
import { SubScreen } from '@/components/screen';
import { AppText, Card, EmptyState, ErrorState, Loading, Pressable } from '@/components/ui';
import { useTags } from '@/features/queries';

export default function TagsPage() {
  const navigate = useNavigate();
  const tags = useTags();
  return (
    <SubScreen title="태그별 내역">
      {tags.error ? (
        <ErrorState error={tags.error} onRetry={() => tags.refetch()} />
      ) : !tags.data ? (
        <Loading />
      ) : tags.data.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="아직 태그가 없어요" description="지출을 기록할 때 태그를 달면 여기에 모여요" />
      ) : (
        <Card>
          {tags.data.map((t) => (
            <Pressable key={t.id} onClick={() => navigate(`/tag/${t.id}`)} className="tag-row">
              <AppText lines={1} style={{ flex: 1, minWidth: 0 }}>#{t.name}</AppText>
              <AppText variant="caption" tone="textSub" className="nowrap">{t.count}건</AppText>
              <AppText variant="label" className="tabular nowrap">{formatWon(t.total)}</AppText>
            </Pressable>
          ))}
        </Card>
      )}
    </SubScreen>
  );
}
