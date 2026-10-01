import { z } from 'zod';

export const TxTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
export const CategoryTypeEnum = z.enum(['INCOME', 'EXPENSE']);
export const AccountTypeEnum = z.enum(['CASH', 'BANK', 'CARD']);

export type TxType = z.infer<typeof TxTypeEnum>;
export type CategoryType = z.infer<typeof CategoryTypeEnum>;
export type AccountType = z.infer<typeof AccountTypeEnum>;

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM 형식이어야 합니다');
const amount = z.number().int().positive().max(1_000_000_000_000);
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const SignupSchema = z.object({
  email: z.string().email('이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다').max(72),
  nickname: z.string().min(1, '닉네임을 입력하세요').max(20),
});
export const LoginSchema = z.object({
  email: z.string().email('이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});
export const RefreshSchema = z.object({ refreshToken: z.string().min(1) });

export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(30),
  type: AccountTypeEnum,
  initialBalance: z.number().int().default(0),
  color: hexColor.default('#3182F6'),
});
export const AccountUpdateSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  type: AccountTypeEnum.optional(),
  color: hexColor.optional(),
});

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(20),
  type: CategoryTypeEnum,
  icon: z.string().min(1).max(40),
  color: hexColor,
});
export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  icon: z.string().min(1).max(40).optional(),
  color: hexColor.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const transactionBase = z.object({
  type: TxTypeEnum,
  amount,
  accountId: z.string().min(1),
  toAccountId: z.string().min(1).nullish(),
  categoryId: z.string().min(1).nullish(),
  memo: z.string().max(100).nullish(),
  occurredAt: z.string().datetime({ offset: true }),
});

type TxShape = z.infer<typeof transactionBase>;
function refineTx(v: TxShape, ctx: z.RefinementCtx) {
  if (v.type === 'TRANSFER') {
    if (!v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: '이체 대상 계좌가 필요합니다' });
    else if (v.toAccountId === v.accountId)
      ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: '같은 계좌로 이체할 수 없습니다' });
  } else if (!v.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: '카테고리를 선택하세요' });
  }
}

export const TransactionCreateSchema = transactionBase.superRefine(refineTx);
/** 수정은 전체 필드 교체 방식(PUT 의미)으로 받아 검증을 단순하게 유지 */
export const TransactionUpdateSchema = TransactionCreateSchema;
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

export const TransactionQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  type: TxTypeEnum.optional(),
  q: z.string().max(50).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

export const MonthQuerySchema = z.object({ month });
export const TrendQuerySchema = z.object({
  month,
  months: z.coerce.number().int().min(1).max(24).default(6),
});
export const ExportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export const BudgetUpsertSchema = z.object({
  month,
  items: z.array(z.object({ categoryId: z.string().nullable(), amount })).max(50),
});
export type BudgetUpsert = z.infer<typeof BudgetUpsertSchema>;
