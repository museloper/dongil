import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import type { CategoryDto, CategoryType } from '@dongil/shared';
import { CategoryIcon, ICON_CHOICES } from '@/components/category-icon';
import { AppText, Button, Card, ErrorState, IconButton, Input, Loading, PressableScale, Segmented, haptic } from '@/components/ui';
import { useCategories, useDeleteCategory, useSaveCategory, type CategoryInput } from '@/features/queries';
import { useTheme } from '@/theme/theme';
import { SWATCHES } from '@/theme/tokens';
import { ColorPicker } from '@/components/color-picker';

export default function CategoriesScreen() {
  const categories = useCategories();
  const save = useSaveCategory();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editing, setEditing] = useState<CategoryDto | 'new' | null>(null);

  if (categories.error) return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;
  if (!categories.data) return <Loading />;

  const list = categories.data.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder);

  /** 위/아래 이웃과 sortOrder 를 맞바꾼다 */
  const move = (index: number, delta: -1 | 1) => {
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    const [orderA, orderB] = a.sortOrder === b.sortOrder ? [index + delta, index] : [b.sortOrder, a.sortOrder];
    save.mutate({ id: a.id, body: { sortOrder: orderA } });
    save.mutate({ id: b.id, body: { sortOrder: orderB } });
  };

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

      {editing ? (
        <CategoryEditor
          key={editing === 'new' ? `new-${type}` : editing.id}
          type={type}
          category={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button title="카테고리 추가" icon="add" kind="secondary" onPress={() => setEditing('new')} />
      )}

      <Card padded={false} style={{ paddingVertical: 6 }}>
        {list.map((c, i) => (
          <Animated.View key={c.id} layout={LinearTransition} style={styles.row}>
            <PressableScale onPress={() => setEditing(c)} style={styles.rowMain} scaleTo={0.98}>
              <CategoryIcon icon={c.icon} color={c.color} size={38} />
              <AppText style={{ flex: 1 }}>{c.name}</AppText>
            </PressableScale>
            <IconButton name="chevron-up" size={18} tone={i === 0 ? 'textMuted' : 'textSub'} onPress={() => move(i, -1)} />
            <IconButton name="chevron-down" size={18} tone={i === list.length - 1 ? 'textMuted' : 'textSub'} onPress={() => move(i, 1)} />
          </Animated.View>
        ))}
      </Card>
    </ScrollView>
  );
}

function CategoryEditor({ type, category, onDone }: { type: CategoryType; category?: CategoryDto; onDone: () => void }) {
  const { colors } = useTheme();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [form, setForm] = useState<CategoryInput>({
    name: category?.name ?? '',
    type,
    icon: category?.icon ?? 'happy',
    color: category?.color ?? SWATCHES[6],
  });
  const [error, setError] = useState<string | null>(null);

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
    Alert.alert(`'${category.name}'을(를) 삭제할까요?`, '기존 내역의 카테고리 표시는 유지돼요', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CategoryIcon icon={form.icon} color={form.color} size={48} />
          <View style={{ flex: 1 }}>
            <Input value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="카테고리 이름" maxLength={20} />
          </View>
        </View>
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
                <Ionicons name={icon} size={20} color={active ? form.color : colors.textSub} />
              </PressableScale>
            );
          })}
        </View>
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
