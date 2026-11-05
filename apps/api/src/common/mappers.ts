import type { Account, BookNote, Category, Transaction } from '@prisma/client';
import type { AccountDto, CategoryDto, NoteDto, TransactionDto } from '@dongil/shared';

/** BigInt 금액은 JSON 직렬화가 안 되므로 응답 직전에 number 로 바꾼다 (원 단위라 안전 범위 내) */
export const toAccountDto = (a: Account): AccountDto => ({
  id: a.id,
  name: a.name,
  type: a.type,
  balance: Number(a.balance),
  color: a.color,
});

export const toCategoryDto = (c: Category): CategoryDto => ({
  id: c.id,
  name: c.name,
  type: c.type,
  icon: c.icon,
  color: c.color,
  sortOrder: c.sortOrder,
  parentId: c.parentId,
});

type TxWithRelations = Transaction & {
  account: Account;
  toAccount: Account | null;
  category: (Category & { parent: { name: string } | null }) | null;
  tags: { id: string; name: string }[];
  createdBy: { id: string; nickname: string };
};

export const txInclude = {
  account: true,
  toAccount: true,
  category: { include: { parent: { select: { name: true } } } },
  tags: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
  createdBy: { select: { id: true, nickname: true } },
} as const;

export const toTransactionDto = (t: TxWithRelations): TransactionDto => ({
  id: t.id,
  type: t.type,
  amount: Number(t.amount),
  memo: t.memo,
  occurredAt: t.occurredAt.toISOString(),
  account: { id: t.account.id, name: t.account.name, color: t.account.color },
  toAccount: t.toAccount ? { id: t.toAccount.id, name: t.toAccount.name, color: t.toAccount.color } : null,
  category: t.category
    ? {
        id: t.category.id,
        name: t.category.name,
        icon: t.category.icon,
        color: t.category.color,
        parentName: t.category.parent?.name ?? null,
      }
    : null,
  importance: t.importance,
  tags: t.tags,
  author: { id: t.createdBy.id, nickname: t.createdBy.nickname },
});

export const noteInclude = { author: { select: { id: true, nickname: true } } } as const;

export const toNoteDto = (n: BookNote & { author: { id: string; nickname: string } }): NoteDto => ({
  id: n.id,
  content: n.content,
  author: { id: n.author.id, nickname: n.author.nickname },
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});
