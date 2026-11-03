/** localStorage 래퍼. 사파리 private 모드 등에서 접근이 막혀도 앱이 죽지 않도록 */
export const storage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode 등 */
    }
  },
  deleteItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};
