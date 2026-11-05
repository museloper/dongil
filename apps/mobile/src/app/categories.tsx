import { Fragment, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { groupCategories, type CategoryDto, type CategoryType } from '@dongil/shared';
import { CategoryGlyph, CategoryIcon, ICON_CHOICES } from '@/components/category-icon';
import { AppText, Button, Card, Chip, ErrorState, IconButton, Input, Loading, PressableScale, Segmented, haptic } from '@/components/ui';
import { useCategories, useDeleteCategory, useSaveCategory, type CategoryInput } from '@/features/queries';
import { useTheme } from '@/theme/theme';
import { SWATCHES } from '@/theme/tokens';
import { ColorPicker } from '@/components/color-picker';

/** category 가 있으면 수정, parent 만 있으면 그 아래에 세부 추가, 둘 다 없으면 최상위 추가 */
type Editing = { category?: CategoryDto; parent?: CategoryDto };

export default function CategoriesScreen() {
  const categories = useCategories();
  const save = useSaveCategory();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editing, setEditing] = useState<Editing | null>(null);

  if (categories.error) return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;
  if (!categories.data) return <Loading />;

  const groups = groupCategories(categories.data.filter((c) => c.type === type));
  const parents = groups.map((g) => g.parent);

  /** 같은 묶음 안에서 위/아래 이웃과 sortOrder 를 맞바꾼다 */
  const move = (siblings: CategoryDto[], index: number, delta: -1 | 1) => {
    const a = siblings[index];
    const b = siblings[index + delta];
    if (!a || !b) return;
    const [orderA, orderB] = a.sortOrder === b.sortOrder ? [index + delta, index] : [b.sortOrder, a.sortOrder];
    save.mutate({ id: a.id, body: { sortOrder: orderA } });
    save.mutate({ id: b.id, body: { sortOrder: orderB } });
  };

  const editor = (key: string) => (
    <CategoryEditor
      key={key}
      type={type}
      category={editing?.category}
      initialParent={editing?.parent}
      parents={parents}
      hasChildren={groups.some((g) => g.parent.id === editing?.category?.id && g.children.length > 0)}
      onDone={() => setEditing(null)}
    />
  );
  // 고른 줄 바로 아래에 편집 칸을 열어, 긴 목록에서도 눌렀을 때 바로 보이게 한다
  const editorUnder = (id: string) =>
    (editing?.category?.id ?? editing?.parent?.id) === id ? (
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>{editor(`${id}-${editing?.category ? 'edit' : 'sub'}`)}</View>
    ) : null;

  const row = (c: CategoryDto, siblings: CategoryDto[], i: number) => (
    <Fragment key={c.id}>
      <Animated.View layout={LinearTransition} style={[styles.row, c.parentId ? { paddingLeft: 28 } : null]}>
        <PressableScale onPress={() => setEditing({ category: c })} style={[styles.rowMain, c.parentId ? { paddingVertical: 8 } : null]} scaleTo={0.98}>
          <CategoryIcon icon={c.icon} color={c.color} size={c.parentId ? 30 : 38} />
          <AppText numberOfLines={1} style={{ flex: 1 }}>{c.name}</AppText>
        </PressableScale>
        {!c.parentId && <IconButton name="add" label={`${c.name}에 세부 카테고리 추가`} size={18} tone="textSub" onPress={() => setEditing({ parent: c })} />}
        <IconButton name="chevron-up" size={18} tone={i === 0 ? 'textMuted' : 'textSub'} onPress={() => move(siblings, i, -1)} />
        <IconButton name="chevron-down" size={18} tone={i === siblings.length - 1 ? 'textMuted' : 'textSub'} onPress={() => move(siblings, i, 1)} />
      </Animated.View>
      {editorUnder(c.id)}
    </Fragment>
  );

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Segmented<CategoryType>
        value={type}
        onChange={(t) => {
          setType(t);
          setEditing(null);
        }}
        options={[
          { value: 'EXPENSE', label: '지출' },
          { value: 'INCOME', label: '수입' },
        ]}
      />

      {editing && !editing.category && !editing.parent ? (
        editor(`new-${type}`)
      ) : (
        <Button title="카테고리 추가" icon="add" kind="secondary" onPress={() => setEditing({})} />
      )}

      <Card padded={false} style={{ paddingVertical: 6 }}>
        {groups.map((g, i) => (
          <Fragment key={g.parent.id}>
            {row(g.parent, parents, i)}
            {g.children.map((c, j) => row(c, g.children, j))}
          </Fragment>
        ))}
      </Card>
    </ScrollView>
  );
}

function CategoryEditor({ type, category, initialParent, parents, hasChildren, onDone }: {
  type: CategoryType;
  category?: CategoryDto;
  initialParent?: CategoryDto;
  parents: CategoryDto[];
  hasChildren: boolean;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [form, setForm] = useState<CategoryInput>({
    name: category?.name ?? '',
    type,
    icon: category?.icon ?? 'happy',
    color: category?.color ?? SWATCHES[6],
    parentId: category?.parentId ?? initialParent?.id ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const candidates = parents.filter((p) => p.id !== category?.id);
  const parent = candidates.find((p) => p.id === form.parentId);

  const submit = () => {
    if (!form.name.trim()) return setError('이름을 입력하세요');
    save.mutate(
      { id: category?.id, body: { ...form, name: form.name.trim() } },
      { onSuccess: () => (haptic('success'), onDone()), onError: (e) => setError(e.message) },
    );
  };

  const onDelete = () => {
    if (!category) return;
    const run = () => remove.mutate(category.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
    if (Platform.OS === 'web') return run();
    const message = hasChildren ? '세부 카테고리도 함께 삭제돼요. 기존 내역의 카테고리 표시는 유지돼요' : '기존 내역의 카테고리 표시는 유지돼요';
    Alert.alert(`'${category.name}'을(를) 삭제할까요?`, message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card style={{ gap: 16, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CategoryIcon icon={parent?.icon ?? form.icon} color={parent?.color ?? form.color} size={48} />
          <View style={{ flex: 1 }}>
            <Input value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder={parent ? '세부 카테고리 이름' : '카테고리 이름'} maxLength={20} />
          </View>
        </View>
        {/* 세부를 가진 카테고리는 3단계가 되므로 옮길 수 없다 */}
        {!hasChildren && candidates.length > 0 && (
          <View style={{ gap: 8 }}>
            <AppText variant="label" tone="textSub">상위 카테고리</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
              <Chip label="없음" active={!form.parentId} onPress={() => setForm((f) => ({ ...f, parentId: null }))} />
              {candidates.map((p) => (
                <Chip key={p.id} label={p.name} active={p.id === form.parentId} color={p.color} onPress={() => setForm((f) => ({ ...f, parentId: p.id }))} />
              ))}
            </ScrollView>
          </View>
        )}
        {parent ? (
          <AppText variant="caption" tone="textMuted">세부 카테고리는 상위 카테고리의 아이콘과 색을 따라요</AppText>
        ) : (
          <>
            <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((icon) => {
                const active = icon === form.icon;
                return (
                  <PressableScale
                    key={icon}
                    onPress={() => setForm((f) => ({ ...f, icon }))}
                    style={[styles.iconCell, { backgroundColor: active ? `${form.color}26` : colors.fill }]}
                    scaleTo={0.85}>
                    <CategoryGlyph icon={icon} size={20} color={active ? form.color : colors.textSub} />
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}
        {error && <AppText tone="expense">{error}</AppText>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="취소" kind="ghost" onPress={onDone} style={{ flex: 1 }} />
          <Button title="저장" onPress={submit} loading={save.isPending} style={{ flex: 2 }} />
        </View>
        {category && <Button title="삭제" kind="danger" onPress={onDelete} loading={remove.isPending} />}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
