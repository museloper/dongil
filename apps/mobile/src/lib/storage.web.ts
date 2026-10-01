/** 웹 미리보기용: SecureStore 가 없으므로 localStorage 사용 */
export const storage = {
  getItem: async (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* private mode 등 */
    }
  },
  deleteItem: async (key: string) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* noop */
    }
  },
};
