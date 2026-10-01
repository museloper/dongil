import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AuthResponse, AuthTokens } from '@dongil/shared';
import { storage } from './storage';

/**
 * API 주소 결정 순서
 * 1) EXPO_PUBLIC_API_URL 환경변수
 * 2) Expo 개발 서버가 떠 있는 PC 의 LAN IP (실기기 + Expo Go)
 * 3) 에뮬레이터/웹 기본값
 */
function resolveBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:3000/api/v1`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : 'http://localhost:3000/api/v1';
}

export const API_BASE = resolveBaseUrl();
const TOKEN_KEY = 'auth-tokens';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let tokens: AuthTokens | null = null;
let refreshing: Promise<boolean> | null = null;
let onAuthExpired: () => void = () => {};

export const tokenStore = {
  get: () => tokens,
  async set(next: AuthTokens | null) {
    tokens = next;
    if (next) await storage.setItem(TOKEN_KEY, JSON.stringify(next));
    else await storage.deleteItem(TOKEN_KEY);
  },
  async load() {
    const raw = await storage.getItem(TOKEN_KEY);
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

/** 동시에 여러 요청이 401 을 받아도 refresh 는 한 번만 수행 */
function refreshTokens(): Promise<boolean> {
  const current = tokens;
  if (!current) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as AuthResponse;
      await tokenStore.set({ accessToken: body.accessToken, refreshToken: body.refreshToken });
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
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
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
    throw new ApiError(0, '서버에 연결할 수 없어요. 네트워크를 확인해 주세요.');
  }

  if (res.status === 401 && canRetry && tokens) {
    if (await refreshTokens()) return api<T>(path, init, false);
    await tokenStore.set(null);
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
