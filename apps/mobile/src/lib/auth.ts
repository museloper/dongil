import { create } from 'zustand';
import type { AuthResponse, UserDto } from '@dongil/shared';
import { api, ApiError, setOnAuthExpired, tokenStore } from './api';
import { useBookStore } from './book-store';
import { queryClient } from './query-client';

type Status = 'loading' | 'authed' | 'guest';

interface AuthState {
  status: Status;
  user: UserDto | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  const accept = async (res: AuthResponse) => {
    await tokenStore.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ status: 'authed', user: res.user });
  };

  setOnAuthExpired(() => {
    queryClient.clear();
    set({ status: 'guest', user: null });
  });

  return {
    status: 'loading',
    user: null,

    bootstrap: async () => {
      if (!(await tokenStore.load())) return set({ status: 'guest' });
      try {
        set({ status: 'authed', user: await api<UserDto>('/me') });
      } catch (e) {
        // 서버에 못 붙은 경우엔 로그인 상태는 유지 (화면에서 에러 표시)
        if (e instanceof ApiError && e.status === 0) set({ status: 'authed' });
        else set({ status: 'guest' });
      }
    },

    login: async (email, password) => {
      await accept(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }));
    },

    signup: async (email, password, nickname) => {
      await accept(await api<AuthResponse>('/auth/signup', { method: 'POST', body: { email, password, nickname } }));
    },

    logout: async () => {
      const t = tokenStore.get();
      if (t) await api('/auth/logout', { method: 'POST', body: { refreshToken: t.refreshToken } }).catch(() => {});
      await tokenStore.set(null);
      queryClient.clear();
      useBookStore.getState().reset();
      set({ status: 'guest', user: null });
    },
  };
});
