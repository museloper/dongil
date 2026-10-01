import * as SecureStore from 'expo-secure-store';

/** 네이티브: 토큰 등을 키체인/키스토어에 암호화 저장 */
export const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
};
