import { useState } from 'react';
import { groupCategories, type CategoryDto, type CategoryType } from '@dongil/shared';
import { CategoryIcon, ICON_CHOICES, tint } from '@/components/category-icon';
import { ColorPicker } from '@/components/color-picker';
import { confirm } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { SubScreen } from '@/components/screen';
import { AppText, Button, Card, Chip, ErrorState, IconButton, Input, Loading, Pressable, Segmented, haptic } from '@/components/ui';
import { useCategories, useDeleteCategory, useSaveCategory, type CategoryInput } from '@/features/queries';
import { SWATCHES } from '@/theme/tokens';

/** category 가 있으면 수정, parent 만 있으면 그 아래에 세부 추가, 둘 다 없으면 최상위 추가 */
type Editing = { category?: CategoryDto; parent?: CategoryDto };

export default function CategoriesPage() {
  const categories = useCategories();
  const save = useSaveCategory();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editing, setEditing] = useState<Editing | null>(null);

  const groups = groupCategories((categories.data ?? []).filter((c) => c.type === type));
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
    (editing?.category?.id ?? editing?.parent?.id) === id ? <div style={{ padding: '0 12px 12px' }}>{editor(`${id}-${editing?.category ? 'edit' : 'sub'}`)}</div> : null;

  const row = (c: CategoryDto, siblings: CategoryDto[], i: number) => (
    <div key={c.id}>
      <div className="row" style={{ paddingRight: 10, paddingLeft: c.parentId ? 28 : 0 }}>
        <Pressable onClick={() => setEditing({ category: c })} className="list-row" style={{ flex: 1, minWidth: 0, paddingTop: c.parentId ? 8 : 12, paddingBottom: c.parentId ? 8 : 12 }}>
          <CategoryIcon icon={c.icon} color={c.color} size={c.parentId ? 30 : 38} />
          <AppText lines={1} style={{ flex: 1, textAlign: 'left' }}>{c.name}</AppText>
        </Pressable>
        {!c.parentId && <IconButton name="add" label={`${c.name}에 세부 카테고리 추가`} size={18} tone="textSub" onClick={() => setEditing({ parent: c })} />}
        <IconButton name="chevron-up" label="위로" size={18} tone={i === 0 ? 'textMuted' : 'textSub'} disabled={i === 0} onClick={() => move(siblings, i, -1)} />
        <IconButton name="chevron-down" label="아래로" size={18} tone={i === siblings.length - 1 ? 'textMuted' : 'textSub'} disabled={i === siblings.length - 1} onClick={() => move(siblings, i, 1)} />
      </div>
      {editorUnder(c.id)}
    </div>
  );

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

          {editing && !editing.category && !editing.parent ? (
            editor(`new-${type}`)
          ) : (
            <Button title="카테고리 추가" icon="add" kind="secondary" onClick={() => setEditing({})} />
          )}

          <Card padded={false} style={{ padding: '6px 0' }}>
            {groups.map((g, i) => (
              <div key={g.parent.id}>
                {row(g.parent, parents, i)}
                {g.children.map((c, j) => row(c, g.children, j))}
              </div>
            ))}
          </Card>
        </>
      )}
    </SubScreen>
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
    const message = hasChildren ? '세부 카테고리도 함께 삭제돼요. 기존 내역의 카테고리 표시는 유지돼요' : '기존 내역의 카테고리 표시는 유지돼요';
    if (!(await confirm({ title: `'${category.name}'을(를) 삭제할까요?`, message, action: '삭제' }))) return;
    remove.mutate(category.id, { onSuccess: onDone, onError: (e) => setError(e.message) });
  };

  return (
    <Card className="fade-in-up" style={{ display: 'grid', gap: 16, backgroundColor: 'var(--bg)' }}>
      <div className="row" style={{ gap: 12 }}>
        <CategoryIcon icon={parent?.icon ?? form.icon} color={parent?.color ?? form.color} size={48} />
        <div style={{ flex: 1 }}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={parent ? '세부 카테고리 이름' : '카테고리 이름'} aria-label="카테고리 이름" maxLength={20} />
        </div>
      </div>
      {/* 세부를 가진 카테고리는 3단계가 되므로 옮길 수 없다 */}
      {!hasChildren && candidates.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <AppText variant="label" tone="textSub">상위 카테고리</AppText>
          <div className="hscroll">
            <Chip label="없음" active={!form.parentId} onClick={() => setForm((f) => ({ ...f, parentId: null }))} />
            {candidates.map((p) => (
              <Chip key={p.id} label={p.name} active={p.id === form.parentId} color={p.color} onClick={() => setForm((f) => ({ ...f, parentId: p.id }))} />
            ))}
          </div>
        </div>
      )}
      {parent ? (
        <AppText variant="caption" tone="textMuted">세부 카테고리는 상위 카테고리의 아이콘과 색을 따라요</AppText>
      ) : (
        <>
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
        </>
      )}
      {error && <AppText tone="expense">{error}</AppText>}
      <div className="row" style={{ gap: 8 }}>
        <Button title="취소" kind="ghost" onClick={onDone} style={{ flex: 1 }} />
        <Button title="저장" onClick={submit} loading={save.isPending} style={{ flex: 2 }} />
      </div>
      {category && <Button title="삭제" kind="danger" onClick={onDelete} loading={remove.isPending} />}
    </Card>
  );
}
