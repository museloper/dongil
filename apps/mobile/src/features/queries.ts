import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  monthRange,
  type AccountDto,
  type AccountType,
  type BookDto,
  type BudgetDto,
  type BudgetUpsert,
  type CalendarDayDto,
  type CategoryDto,
  type CategoryStatDto,
  type CategoryType,
  type InviteDto,
  type Paginated,
  type SummaryDto,
  type TransactionCreate,
  type TransactionDto,
  type TrendPointDto,
  type TxType,
} from '@dongil/shared';
import { api } from '@/lib/api';
import { useBookStore } from '@/lib/book-store';

export interface TxFilter {
  from?: string;
  to?: string;
  type?: TxType;
  categoryId?: string;
  accountId?: string;
  q?: string;
}

export const monthFilter = (month: string): TxFilter => {
  const { start, end } = monthRange(month);
  return { from: start.toISOString(), to: end.toISOString() };
};

/** 가계부 하위 API 경로 */
export const bookPath = (bookId: string, path: string) => `/books/${bookId}${path}`;

/** 돈이 움직이면 영향을 받는 모든 캐시 무효화 (모든 가계부) */
function invalidateMoney(qc: QueryClient) {
  for (const key of ['transactions', 'stats', 'budget', 'accounts']) qc.invalidateQueries({ queryKey: [key] });
}

// ---------- 가계부 ----------

export const useBooks = () => useQuery({ queryKey: ['books'], queryFn: () => api<BookDto[]>('/books') });

/** 현재 선택된 가계부. 저장된 선택이 없거나 목록에 없으면 개인 가계부 */
export function useCurrentBook() {
  const books = useBooks();
  const selected = useBookStore((s) => s.bookId);
  const list = books.data ?? [];
  const book = list.find((b) => b.id === selected) ?? list.find((b) => b.type === 'PERSONAL') ?? list[0];
  return { book, books };
}

/** 현재 가계부 id. 목록을 불러오기 전에는 undefined (그동안 하위 쿼리는 대기) */
export const useBookId = () => useCurrentBook().book?.id;

export function useCreateBook() {
  const qc = useQueryClient();
  const select = useBookStore((s) => s.select);
  return useMutation({
    mutationFn: (name: string) => api<BookDto>('/books', { method: 'POST', body: { name } }),
    onSuccess: (book) => {
      qc.invalidateQueries({ queryKey: ['books'] });
      select(book.id);
    },
  });
}

export function useJoinBook() {
  const qc = useQueryClient();
  const select = useBookStore((s) => s.select);
  return useMutation({
    mutationFn: (code: string) => api<BookDto>('/books/join', { method: 'POST', body: { code } }),
    onSuccess: (book) => {
      qc.invalidateQueries({ queryKey: ['books'] });
      select(book.id);
    },
  });
}

export function useRenameBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api<BookDto>(`/books/${id}`, { method: 'PATCH', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: (bookId: string) => api<InviteDto>(`/books/${bookId}/invite`, { method: 'POST' }),
  });
}

/** 나가기(본인) / 내보내기(OWNER) / 삭제 후에는 개인 가계부로 돌아간다 */
export function useLeaveOrRemove() {
  const qc = useQueryClient();
  const reset = useBookStore((s) => s.reset);
  return useMutation({
    mutationFn: (args: { bookId: string; kind: 'delete' } | { bookId: string; kind: 'member'; userId: string }) =>
      args.kind === 'delete'
        ? api<void>(`/books/${args.bookId}`, { method: 'DELETE' })
        : api<void>(`/books/${args.bookId}/members/${args.userId}`, { method: 'DELETE' }),
    onSuccess: (_d, args) => {
      if (args.kind === 'delete') reset();
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

// ---------- 조회 (현재 가계부) ----------

export function useAccounts() {
  const bookId = useBookId();
  return useQuery({
    queryKey: ['accounts', bookId],
    queryFn: () => api<AccountDto[]>(bookPath(bookId!, '/accounts')),
    enabled: !!bookId,
  });
}

export function useCategories() {
  const bookId = useBookId();
  return useQuery({
    queryKey: ['categories', bookId],
    queryFn: () => api<CategoryDto[]>(bookPath(bookId!, '/categories')),
    enabled: !!bookId,
  });
}

export function useTransactions(filter: TxFilter, pageSize = 30, enabled = true) {
  const bookId = useBookId();
  return useInfiniteQuery({
    queryKey: ['transactions', bookId, filter, pageSize],
    enabled: enabled && !!bookId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api<Paginated<TransactionDto>>(bookPath(bookId!, '/transactions'), {
        query: { ...filter, cursor: pageParam, limit: pageSize },
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useTransaction(id: string | undefined) {
  const bookId = useBookId();
  return useQuery({
    queryKey: ['transactions', bookId, 'one', id],
    queryFn: () => api<TransactionDto>(bookPath(bookId!, `/transactions/${id}`)),
    enabled: !!id && !!bookId,
  });
}

function useStat<T>(name: string, query: Record<string, string | number>) {
  const bookId = useBookId();
  return useQuery({
    queryKey: ['stats', bookId, name, query],
    queryFn: () => api<T>(bookPath(bookId!, `/stats/${name}`), { query }),
    enabled: !!bookId,
  });
}

export const useSummary = (month: string) => useStat<SummaryDto>('summary', { month });
export const useByCategory = (month: string) => useStat<CategoryStatDto[]>('by-category', { month });
export const useTrend = (month: string, months = 6) => useStat<TrendPointDto[]>('trend', { month, months });
export const useCalendar = (month: string) => useStat<CalendarDayDto[]>('calendar', { month });

export function useBudget(month: string) {
  const bookId = useBookId();
  return useQuery({
    queryKey: ['budget', bookId, month],
    queryFn: () => api<BudgetDto>(bookPath(bookId!, '/budgets'), { query: { month } }),
    enabled: !!bookId,
  });
}

// ---------- 변경 (현재 가계부) ----------

export function useSaveTransaction() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: TransactionCreate }) =>
      id
        ? api<TransactionDto>(bookPath(bookId!, `/transactions/${id}`), { method: 'PUT', body })
        : api<TransactionDto>(bookPath(bookId!, '/transactions'), { method: 'POST', body }),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: (id: string) => api<void>(bookPath(bookId!, `/transactions/${id}`), { method: 'DELETE' }),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: (body: BudgetUpsert) => api<BudgetDto>(bookPath(bookId!, '/budgets'), { method: 'PUT', body }),
    onSuccess: (data) => qc.setQueryData(['budget', bookId, data.month], data),
  });
}

export interface AccountInput {
  name: string;
  type: AccountType;
  color: string;
  initialBalance?: number;
}

export function useSaveAccount() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AccountInput }) => {
      if (id) {
        const { initialBalance: _ignored, ...rest } = body;
        return api<AccountDto>(bookPath(bookId!, `/accounts/${id}`), { method: 'PATCH', body: rest });
      }
      return api<AccountDto>(bookPath(bookId!, '/accounts'), { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: (id: string) => api<void>(bookPath(bookId!, `/accounts/${id}`), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export function useSaveCategory() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<CategoryInput> & { sortOrder?: number } }) => {
      if (id) {
        const { type: _ignored, ...rest } = body;
        return api<CategoryDto>(bookPath(bookId!, `/categories/${id}`), { method: 'PATCH', body: rest });
      }
      return api<CategoryDto>(bookPath(bookId!, '/categories'), { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const bookId = useBookId();
  return useMutation({
    mutationFn: (id: string) => api<void>(bookPath(bookId!, `/categories/${id}`), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
