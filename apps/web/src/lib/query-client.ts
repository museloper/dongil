import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  // 가계부 하위 요청이 404 면 상대가 나를 내보냈거나 가계부를 지웠을 수 있다.
  // 목록을 다시 받으면 useCurrentBook 이 남아 있는 가계부(개인)로 자동 전환한다.
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (err instanceof ApiError && err.status === 404 && query.queryKey[0] !== 'books') {
        queryClient.invalidateQueries({ queryKey: ['books'] });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});
