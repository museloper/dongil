import type { AuthResponse, AuthTokens } from '@dongil/shared';
import { storage } from './storage';

/**
 * API 주소 결정 순서
 * 1) VITE_API_URL 환경변수
 * 2) 지금 접속한 호스트의 3000 포트 (같은 LAN 의 폰에서 PC 의 개발 서버로 접속하는 경우)
 */
function resolveBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  return `${location.protocol}//${location.hostname}:3000/api/v1`;
}

export const API_BASE = resolveBaseUrl();
const TOKEN_KEY = 'auth-tokens';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let tokens: AuthTokens | null = null;
let refreshing: Promise<boolean> | null = null;
let onAuthExpired: () => void = () => {};

export const tokenStore = {
  get: () => tokens,
  set(next: AuthTokens | null) {
    tokens = next;
    if (next) storage.setItem(TOKEN_KEY, JSON.stringify(next));
    else storage.deleteItem(TOKEN_KEY);
  },
  load() {
    const raw = storage.getItem(TOKEN_KEY);
    try {
      tokens = raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      tokens = null;
    }
    return tokens;
  },
};

export function setOnAuthExpired(fn: () => void) {
  onAuthExpired = fn;
}

/**
 * 동시에 여러 요청이 401 을 받아도 refresh 는 한 번만 수행.
 * refresh 토큰은 매번 회전하고 재사용이 막히므로, 탭을 여러 개 열어둔 경우를 위해
 * 다른 탭이 이미 회전시킨 토큰이 저장소에 있으면 그것을 먼저 다시 읽어 쓴다.
 */
function refreshTokens(): Promise<boolean> {
  const stale = tokens;
  const latest = tokenStore.load();
  if (!latest) return Promise.resolve(false);
  if (stale && latest.accessToken !== stale.accessToken) return Promise.resolve(true);
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: latest.refreshToken }),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as AuthResponse;
      tokenStore.set({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Query = Record<string, string | number | undefined | null>;

function toQueryString(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Query } = {},
  canRetry = true,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path + toQueryString(init.query), {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(tokens && { Authorization: `Bearer ${tokens.accessToken}` }),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, navigator.onLine ? '서버에 연결할 수 없어요.' : '오프라인 상태예요. 네트워크를 확인해 주세요.');
  }

  if (res.status === 401 && canRetry && tokens) {
    if (await refreshTokens()) return api<T>(path, init, false);
    tokenStore.set(null);
    onAuthExpired();
    throw new ApiError(401, '로그인이 만료되었어요. 다시 로그인해 주세요.');
  }

  if (!res.ok) {
    let message = '요청을 처리하지 못했어요';
    try {
      const body = await res.json();
      message = (Array.isArray(body.message) ? body.message[0] : body.message) ?? message;
    } catch {
      /* JSON 아님 */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}
