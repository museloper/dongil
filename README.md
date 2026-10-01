# 돈길 (Dongil)

React Native(Expo) 앱 + NestJS API + PostgreSQL 로 만든 개인 가계부.

```
apps/mobile     Expo SDK 57 앱 (Expo Router, Reanimated, TanStack Query, Zustand, react-native-svg)
apps/api        NestJS 11 + Prisma 6 API 서버
packages/shared 앱/서버 공용 Zod 스키마 · 타입 · 금액/날짜 유틸
```

## 실행

사전 준비: Node 20+, pnpm 10, Docker Desktop

```bash
pnpm install
pnpm db:up                                   # Postgres 16 컨테이너 (포트 5432)
cp apps/api/.env.example apps/api/.env
pnpm --filter @dongil/shared build
cd apps/api && npx prisma migrate deploy && pnpm dev   # http://localhost:3000/api/v1, 문서 /api/docs
cd apps/mobile && npx expo start             # Expo Go 로 QR 스캔, 또는 w 로 웹 미리보기
```

- 앱은 Expo 개발 서버가 떠 있는 PC 의 LAN IP:3000 으로 API 를 찾습니다. 다른 주소를 쓰려면 `EXPO_PUBLIC_API_URL` 설정.
- 실기기에서 접속하려면 Windows 방화벽에서 3000 포트 인바운드를 허용해야 합니다.
- 5432 포트를 쓰므로 로컬에 설치된 PostgreSQL 서비스(postgresql-x64-18)가 켜져 있으면 충돌합니다. 서비스를 중지하거나 수동 시작으로 바꿔 두세요.

## 테스트

```bash
cd apps/api
pnpm test        # 단위: 잔액 증감 계산
pnpm test:e2e    # 실제 DB: 인증/토큰 회전, 거래 CRUD 잔액 정합성, KST 월 경계, 통계, 예산, 검색/페이지네이션, CSV, 권한
```

## 기능 (MVP)

회원가입/로그인(JWT + refresh 회전) · 수입/지출/이체 입력(숫자 키패드) · 내역 리스트(검색, 필터, 스와이프 삭제, 무한 스크롤) ·
캘린더 뷰 · 홈 대시보드 · 카테고리 도넛/6개월 추이 · 월/카테고리 예산(80%·100% 경고, 하루 권장 지출) ·
계좌 관리 · 카테고리 커스터마이징(아이콘, 색, 순서) · 다크모드(시스템/라이트/다크) · 월별 CSV 내보내기

2차 예정: 정기 거래 자동 등록(DB 스키마만 준비됨), 예산 푸시 알림, 생체인증 잠금, 위젯

## 배포

`docker compose --profile prod up -d --build` (API 이미지 + DB). JWT 시크릿은 환경변수로 반드시 교체.
