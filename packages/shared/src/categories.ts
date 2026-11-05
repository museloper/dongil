/** 상위 카테고리 순서대로 묶고, 각 묶음에 세부 카테고리를 붙인다 */
export function groupCategories<T extends { id: string; parentId: string | null; sortOrder: number }>(list: T[]) {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  const ids = new Set(sorted.map((c) => c.id));
  return sorted
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .map((parent) => ({ parent, children: sorted.filter((c) => c.parentId === parent.id) }));
}

/** "식비 › 외식". 최상위 카테고리는 이름만 */
export const categoryLabel = (c: { name: string; parentName: string | null }) =>
  c.parentName ? `${c.parentName} › ${c.name}` : c.name;
