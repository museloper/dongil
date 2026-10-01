import type { AccountType, BookType, CategoryType, MemberRole, TxType } from './schemas';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface UserDto {
  id: string;
  email: string;
  nickname: string;
  currency: string;
}
export interface AuthResponse extends AuthTokens {
  user: UserDto;
}

export interface AccountDto {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
}
export interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  sortOrder: number;
}

type AccountRef = Pick<AccountDto, 'id' | 'name' | 'color'>;
type CategoryRef = Pick<CategoryDto, 'id' | 'name' | 'icon' | 'color'>;

export interface TransactionDto {
  id: string;
  type: TxType;
  amount: number;
  memo: string | null;
  occurredAt: string;
  account: AccountRef;
  toAccount: AccountRef | null;
  category: CategoryRef | null;
  /** 거래를 기록한 사람 (공유 가계부에서 표시) */
  author: { id: string; nickname: string };
}

export interface BookMemberDto {
  userId: string;
  nickname: string;
  role: MemberRole;
}
export interface BookDto {
  id: string;
  name: string;
  type: BookType;
  /** 내 역할 */
  role: MemberRole;
  members: BookMemberDto[];
}
export interface InviteDto {
  code: string;
  expiresAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface BudgetItemDto {
  categoryId: string | null;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
  amount: number;
  spent: number;
  ratio: number;
}
export interface BudgetDto {
  month: string;
  items: BudgetItemDto[];
}

export interface SummaryDto {
  month: string;
  income: number;
  expense: number;
  net: number;
  prevExpense: number;
  /** 전월 대비 지출 증감률 (0.12 = +12%), 전월 지출 0이면 null */
  expenseChangeRate: number | null;
}
export interface CategoryStatDto {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  ratio: number;
}
export interface TrendPointDto {
  month: string;
  income: number;
  expense: number;
}
export interface CalendarDayDto {
  /** YYYY-MM-DD (KST) */
  date: string;
  income: number;
  expense: number;
}
