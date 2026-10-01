import { router } from 'expo-router';

/** 모달 닫기: 스택 위에 떠 있으면 dismiss, 딥링크로 바로 열려 아래 화면이 없으면 홈으로 */
export function closeModal() {
  if (router.canDismiss()) router.dismiss();
  else router.replace('/');
}
