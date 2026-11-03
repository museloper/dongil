import { useLocation, useNavigate } from 'react-router';

/**
 * 모달 성격의 화면(거래 입력 등)을 닫는다.
 * 앱 안에서 이동해 왔으면 뒤로, 주소로 바로 열려 이전 기록이 없으면 홈으로 바꾼다.
 * (history.back() 만 쓰면 바로 열린 경우 앱 밖으로 나가 버린다)
 */
export function useCloseModal() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  };
}
