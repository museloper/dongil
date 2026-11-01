# 돈길 웹 (PWA)

개인·공유 가계부 **돈길**의 설치형 웹앱 버전입니다. 브라우저에서 바로 쓰거나, 홈 화면에 추가해 앱처럼 쓸 수 있습니다.
백엔드는 [museloper/dongil](https://github.com/museloper/dongil) 저장소의 NestJS API 를 사용합니다.

## 기능

모바일 앱과 같은 기능을 제공합니다.

- 홈: 이번 달 남은 돈·수입·지출, 예산 사용률, 자산, 최근 내역
- 내역: 리스트(검색·유형 필터·무한 스크롤) / 캘린더
- 통계: 카테고리별 도넛 차트, 최근 6개월 추이
- 예산: 월 전체·카테고리별 예산, 하루 권장 지출, 지난달 예산 불러오기
- 거래 입력: 숫자 키패드(데스크톱은 키보드 숫자 입력도 가능), 지출·수입·이체
- 공유 가계부: 만들기, 초대 코드 발급·공유, 참여, 멤버 관리
- 자산·카테고리 관리, 월별 CSV 내보내기, 라이트/다크 테마
- PWA: 홈 화면 설치, 앱 셸 오프라인 캐시, 새 버전 알림

## 시작하기

```bash
# 1) API 실행 (dongil 저장소)
cd ../dongil && pnpm db:up && cd apps/api && pnpm dev   # http://localhost:3000/api/v1

# 2) 웹앱 실행
npm install
npm run dev        # http://localhost:5173
```

같은 와이파이의 휴대폰에서는 `http://<PC IP>:5173` 으로 접속하면 됩니다. API 주소는 기본적으로 `접속한 호스트:3000` 을 쓰고, 다르면 `.env` 에 `VITE_API_URL` 을 지정합니다(`.env.example` 참고).

> 홈 화면 설치와 서비스워커는 **HTTPS 또는 localhost** 에서만 동작합니다. 휴대폰에서 설치까지 확인하려면 HTTPS 로 배포하세요(이때 API 도 HTTPS 여야 합니다).

## 빌드·배포

```bash
npm run build      # dist/ 생성 (서비스워커 포함)
npm run preview    # 빌드 결과 확인
```

`dist/` 는 정적 파일이라 Vercel·Netlify·Cloudflare Pages·Nginx 등 어디에나 올릴 수 있습니다. 클라이언트 라우팅을 쓰므로 모르는 경로는 `index.html` 로 돌려주도록(SPA fallback) 설정하세요.

## 공용 코드

`src/shared/` 는 dongil 저장소 `packages/shared/src` 의 복사본입니다(Zod 스키마, DTO 타입, 금액/날짜 유틸). 서버와 검증 규칙이 어긋나지 않도록 직접 고치지 말고, dongil 쪽을 수정한 뒤 `npm run sync-shared` 로 가져옵니다.
