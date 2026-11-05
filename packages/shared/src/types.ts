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
  /** 세부 카테고리면 상위 카테고리 id. 2단계까지만 둔다 */
  parentId: string | null;
}

type AccountRef = Pick<AccountDto, 'id' | 'name' | 'color'>;
type CategoryRef = Pick<CategoryDto, 'id' | 'name' | 'icon' | 'color'>;

export type Importance = 'A' | 'B' | 'C';

/** 태그와 그 태그가 달린 지출의 전체 기간 건수·합계 */
export interface TagDto {
  id: string;
  name: string;
  count: number;
  total: number;
}

export interface TransactionDto {
  id: string;
  type: TxType;
  amount: number;
  memo: string | null;
  occurredAt: string;
  account: AccountRef;
  toAccount: AccountRef | null;
  category: (CategoryRef & { parentName: string | null }) | null;
  importance: Importance | null;
  tags: Pick<TagDto, 'id' | 'name'>[];
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
  /** 내가 주로 쓰는 자산. 거래 입력 때 먼저 선택된다 */
  defaultAccountId: string | null;
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
  /**
   * 계좌 간 이체. 수입·지출에 들어가지 않는다.
   * 계좌별 조회면 그 계좌로 들어온/나간 금액, 가계부 전체면 둘 다 이체 총액(가계부 안에서 옮긴 돈)
   */
  transferIn: number;
  transferOut: number;
}
export interface SubcategoryStatDto {
  /** 상위 카테고리 id 와 같으면 세부 없이 상위에 바로 기록한 지출 */
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
  /** 상위 카테고리 금액 대비 */
  ratio: number;
}
export interface CategoryStatDto {
  /** 언제나 최상위 카테고리. 세부 카테고리 금액은 여기에 합쳐진다 */
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  ratio: number;
  /** 세부 카테고리 지출이 있을 때만 채운다 */
  children: SubcategoryStatDto[];
}
export interface ImportanceStatDto {
  /** null 은 중요도를 달지 않은 지출 */
  importance: Importance | null;
  amount: number;
  ratio: number;
}
export interface TagStatDto {
  tagId: string;
  name: string;
  amount: number;
  count: number;
  /** 조건에 맞는 총 지출 대비. 태그가 여러 개인 지출은 태그마다 더해져 합이 1을 넘을 수 있다 */
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

/** 가계부 메모. 같은 가계부 멤버끼리 공유한다 */
export interface NoteDto {
  id: string;
  content: string;
  author: { id: string; nickname: string };
  createdAt: string;
  updatedAt: string;
}
