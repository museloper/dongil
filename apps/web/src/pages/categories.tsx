import { useState } from 'react';
import type { CategoryDto, CategoryType } from '@dongil/shared';
import { CategoryIcon, ICON_CHOICES, tint } from '@/components/category-icon';
import { ColorPicker } from '@/components/color-picker';
import { confirm } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { SubScreen } from '@/components/screen';
import { AppText, Button, Card, ErrorState, IconButton, Input, Loading, Pressable, Segmented, haptic } from '@/components/ui';
import { useCategories, useDeleteCategory, useSaveCategory, type CategoryInput } from '@/features/queries';
import { SWATCHES } from '@/theme/tokens';

export default function CategoriesPage() {
  const categories = useCategories();
  const save = useSaveCategory();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editing, setEditing] = useState<CategoryDto | 'new' | null>(null);

  const list = (categories.data ?? []).filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder);

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
    <SubScreen title="카테고리 관리">
      {categories.error ? (
        <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
      ) : !categories.data ? (
        <Loading />
      ) : (
        <>
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
            <Button title="카테고리 추가" icon="add" kind="secondary" onClick={() => setEditing('new')} />
          )}

          <Card padded={false} style={{ padding: '6px 0' }}>
            {list.map((c, i) => (
              <div key={c.id} className="row" style={{ paddingRight: 10 }}>
                <Pressable onClick={() => setEditing(c)} className="list-row" style={{ flex: 1, paddingTop: 12, paddingBottom: 12 }}>
                  <CategoryIcon icon={c.icon} color={c.color} size={38} />
                  <AppText style={{ flex: 1, textAlign: 'left' }}>{c.name}</AppText>
                </Pressable>
                <IconButton name="chevron-up" label="위로" size={18} tone={i === 0 ? 'textMuted' : 'textSub'} disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton name="chevron-down" label="아래로" size={18} tone={i === list.length - 1 ? 'textMuted' : 'textSub'} disabled={i === list.length - 1} onClick={() => move(i, 1)} />
              </div>
            ))}
          </Card>
        </>
      )}
    </SubScreen>
  );
}

function CategoryEditor({ type, category, onDone }: { type: CategoryType; category?: CategoryDto; onDone: () => void }) {
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
      {
        onSuccess: () => {
          haptic('success');
          onDone();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const onDelete = async () => {
    if (!category) return;
    if (!(await confirm({ title: `'${category.name}'을(를) 삭제할까요?`, message: '기존 내역의 카테고리 표시는 유지돼요', action: '삭제' }))) return;
    remove.mutate(category.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
  };

  return (
    <Card className="fade-in-up" style={{ display: 'grid', gap: 16 }}>
      <div className="row" style={{ gap: 12 }}>
        <CategoryIcon icon={form.icon} color={form.color} size={48} />
        <div style={{ flex: 1 }}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="카테고리 이름" aria-label="카테고리 이름" maxLength={20} />
        </div>
      </div>
      <ColorPicker value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
      <div className="icon-grid">
        {ICON_CHOICES.map((icon) => {
          const active = icon === form.icon;
          return (
            <Pressable
              key={icon}
              onClick={() => setForm((f) => ({ ...f, icon }))}
              className="icon-cell"
              aria-label={icon}
              aria-pressed={active}
              style={{ backgroundColor: active ? tint(form.color) : 'var(--fill)' }}>
              <Icon name={icon} size={20} color={active ? form.color : 'var(--textSub)'} />
            </Pressable>
          );
        })}
      </div>
      {error && <AppText tone="expense">{error}</AppText>}
      <div className="row" style={{ gap: 8 }}>
        <Button title="취소" kind="ghost" onClick={onDone} style={{ flex: 1 }} />
        <Button title="저장" onClick={submit} loading={save.isPending} style={{ flex: 2 }} />
      </div>
      {category && <Button title="삭제" kind="danger" onClick={onDelete} loading={remove.isPending} />}
    </Card>
  );
}
