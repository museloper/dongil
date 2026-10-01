import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  monthRange,
  type AccountDto,
  type AccountType,
  type BudgetDto,
  type BudgetUpsert,
  type CalendarDayDto,
  type CategoryDto,
  type CategoryStatDto,
  type CategoryType,
  type Paginated,
  type SummaryDto,
  type TransactionCreate,
  type TransactionDto,
  type TrendPointDto,
  type TxType,
} from '@dongil/shared';
import { api } from '@/lib/api';

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

/** 돈이 움직이면 영향을 받는 모든 캐시 무효화 */
function invalidateMoney(qc: QueryClient) {
  for (const key of ['transactions', 'stats', 'budget', 'accounts']) qc.invalidateQueries({ queryKey: [key] });
}

// ---------- 조회 ----------

export const useAccounts = () =>
  useQuery({ queryKey: ['accounts'], queryFn: () => api<AccountDto[]>('/accounts') });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api<CategoryDto[]>('/categories') });

export const useTransactions = (filter: TxFilter, pageSize = 30, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['transactions', filter, pageSize],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api<Paginated<TransactionDto>>('/transactions', { query: { ...filter, cursor: pageParam, limit: pageSize } }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useTransaction = (id: string | undefined) =>
  useQuery({
    queryKey: ['transactions', 'one', id],
    queryFn: () => api<TransactionDto>(`/transactions/${id}`),
    enabled: !!id,
  });

export const useSummary = (month: string) =>
  useQuery({ queryKey: ['stats', 'summary', month], queryFn: () => api<SummaryDto>('/stats/summary', { query: { month } }) });

export const useByCategory = (month: string) =>
  useQuery({
    queryKey: ['stats', 'by-category', month],
    queryFn: () => api<CategoryStatDto[]>('/stats/by-category', { query: { month } }),
  });

export const useTrend = (month: string, months = 6) =>
  useQuery({
    queryKey: ['stats', 'trend', month, months],
    queryFn: () => api<TrendPointDto[]>('/stats/trend', { query: { month, months } }),
  });

export const useCalendar = (month: string) =>
  useQuery({
    queryKey: ['stats', 'calendar', month],
    queryFn: () => api<CalendarDayDto[]>('/stats/calendar', { query: { month } }),
  });

export const useBudget = (month: string) =>
  useQuery({ queryKey: ['budget', month], queryFn: () => api<BudgetDto>('/budgets', { query: { month } }) });

// ---------- 변경 ----------

export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: TransactionCreate }) =>
      id
        ? api<TransactionDto>(`/transactions/${id}`, { method: 'PUT', body })
        : api<TransactionDto>('/transactions', { method: 'POST', body }),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetUpsert) => api<BudgetDto>('/budgets', { method: 'PUT', body }),
    onSuccess: (data) => qc.setQueryData(['budget', data.month], data),
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
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AccountInput }) => {
      if (id) {
        const { initialBalance: _ignored, ...rest } = body;
        return api<AccountDto>(`/accounts/${id}`, { method: 'PATCH', body: rest });
      }
      return api<AccountDto>('/accounts', { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/accounts/${id}`, { method: 'DELETE' }),
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
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<CategoryInput> & { sortOrder?: number } }) => {
      if (id) {
        const { type: _ignored, ...rest } = body;
        return api<CategoryDto>(`/categories/${id}`, { method: 'PATCH', body: rest });
      }
      return api<CategoryDto>('/categories', { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
