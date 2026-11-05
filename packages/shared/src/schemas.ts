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

// ---------- 가계부(공유) ----------

export const BookTypeEnum = z.enum(['PERSONAL', 'SHARED']);
export const MemberRoleEnum = z.enum(['OWNER', 'MEMBER']);
export type BookType = z.infer<typeof BookTypeEnum>;
export type MemberRole = z.infer<typeof MemberRoleEnum>;

/** 공유 가계부 최대 인원 */
export const BOOK_MAX_MEMBERS = 2;
/** 초대 코드: 헷갈리는 문자(0,O,1,I)를 뺀 대문자+숫자 6자리 */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

const bookName = z.string().trim().min(1, '가계부 이름을 입력하세요').max(20, '20자 이내로 입력하세요');
export const BookCreateSchema = z.object({ name: bookName });
export const BookUpdateSchema = z.object({ name: bookName });
export const JoinBookSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z2-9]{6}$/, '초대 코드 6자리를 정확히 입력하세요')),
});

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

/** 내가 주로 쓰는 자산 지정. null 이면 해제 */
export const DefaultAccountSchema = z.object({ accountId: z.string().min(1).nullable() });
export type DefaultAccountInput = z.infer<typeof DefaultAccountSchema>;

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(20),
  type: CategoryTypeEnum,
  icon: z.string().min(1).max(40),
  color: hexColor,
  /** 있으면 그 카테고리의 세부 카테고리. 아이콘은 따로 고르고 색은 상위를 따른다 */
  parentId: z.string().min(1).nullish(),
});
export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  icon: z.string().min(1).max(40).optional(),
  color: hexColor.optional(),
  sortOrder: z.number().int().min(0).optional(),
  /** 보내지 않으면 그대로 둔다. null 이면 최상위로 꺼낸다 */
  parentId: z.string().min(1).nullable().optional(),
});

export const IMPORTANCE_LEVELS = ['A', 'B', 'C'] as const;
export const TAG_MAX_LENGTH = 20;
export const TAG_MAX_PER_TRANSACTION = 10;
/** 앞에 붙인 # 은 표시용이므로 저장할 때 뺀다 */
export const TagNameSchema = z
  .string()
  .transform((s) => s.replace(/^#+/, '').trim())
  .pipe(z.string().min(1, '태그를 입력하세요').max(TAG_MAX_LENGTH, `태그는 ${TAG_MAX_LENGTH}자까지 쓸 수 있습니다`));

const transactionBase = z.object({
  type: TxTypeEnum,
  amount,
  accountId: z.string().min(1),
  toAccountId: z.string().min(1).nullish(),
  categoryId: z.string().min(1).nullish(),
  memo: z.string().max(100).nullish(),
  occurredAt: z.string().datetime({ offset: true }),
  /** 보내지 않으면(이전 버전 앱) 수정할 때 기존 값을 유지한다. null 이면 지운다 */
  importance: z.enum(IMPORTANCE_LEVELS).nullish(),
  /** 보내지 않으면(이전 버전 앱) 수정할 때 기존 값을 유지한다. 빈 배열이면 모두 뗀다 */
  tags: z.array(TagNameSchema).max(TAG_MAX_PER_TRANSACTION, `태그는 ${TAG_MAX_PER_TRANSACTION}개까지 달 수 있습니다`).optional(),
});

type TxShape = z.infer<typeof transactionBase>;
function refineTx(v: TxShape, ctx: z.RefinementCtx) {
  if (v.type !== 'EXPENSE') {
    if (v.importance) ctx.addIssue({ code: 'custom', path: ['importance'], message: '중요도는 지출에만 달 수 있습니다' });
    if (v.tags?.length) ctx.addIssue({ code: 'custom', path: ['tags'], message: '태그는 지출에만 달 수 있습니다' });
  }
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
  tagId: z.string().optional(),
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
/** 통계 조회. accountId 를 주면 그 계좌(통장)만, 없으면 가계부 전체 */
export const StatsQuerySchema = MonthQuerySchema.extend({ accountId: z.string().optional() });
export const StatsTrendQuerySchema = TrendQuerySchema.extend({ accountId: z.string().optional() });
/** 지출 통계를 겹쳐 보는 조건. importance 의 NONE 은 중요도를 달지 않은 지출 */
export const StatsBreakdownQuerySchema = StatsQuerySchema.extend({
  importance: z.enum([...IMPORTANCE_LEVELS, 'NONE']).optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
});
export type StatsBreakdownQuery = z.infer<typeof StatsBreakdownQuerySchema>;
export const ExportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export const BudgetUpsertSchema = z.object({
  month,
  items: z.array(z.object({ categoryId: z.string().nullable(), amount })).max(50),
});
export type BudgetUpsert = z.infer<typeof BudgetUpsertSchema>;

// ---------- 가계부 메모 ----------

export const NOTE_MAX_LENGTH = 2000;
const noteContent = z
  .string()
  .trim()
  .min(1, '내용을 입력하세요')
  .max(NOTE_MAX_LENGTH, `${NOTE_MAX_LENGTH}자 이내로 입력하세요`);
export const NoteCreateSchema = z.object({ content: noteContent });
export const NoteUpdateSchema = z.object({ content: noteContent });
export type NoteInput = z.infer<typeof NoteCreateSchema>;
