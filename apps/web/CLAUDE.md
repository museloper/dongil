# 웹 (apps/web)

돈길의 PWA(설치형 웹앱). `apps/api` 를 그대로 쓰는 프론트엔드만 담는다. 모노레포 공통 규칙·도메인 규칙·모바일과의 UI 동기화는 루트 `CLAUDE.md` 를 따른다.

```
Vite 8 + React 19 + TypeScript, react-router 7, TanStack Query 5, Zustand 5, zod 3, vite-plugin-pwa (Workbox)
```

## 명령어 (apps/web 에서)

```bash
pnpm dev               # http://localhost:5173 (--host 로 LAN 에도 열림)
pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint
pnpm build             # 타입체크 + 프로덕션 빌드 (dist/, 서비스워커 포함)
pnpm preview           # 빌드 결과 서빙 (서비스워커·설치는 여기서 확인)
pnpm generate-icons    # public/logo.svg → PWA 아이콘 PNG 재생성
```

의존성 추가는 이 폴더에서 `pnpm add`. React 관련 버전은 모바일과 맞춰야 한다(루트 "환경 함정").

## 놓치면 버그가 되는 규칙

- **`@dongil/shared` 는 `vite.config.ts` alias 와 `tsconfig.json` paths 로 `packages/shared/src` 소스를 읽는다.**
  - shared 의 `dist` 는 CommonJS 라 Vite 개발 서버에서 깨진다. alias 를 지우지 않는다.
  - 입력 검증은 서버와 같은 Zod 스키마(`safeParse`)로 한다. 새 규칙은 shared 에 추가한다.
- **서버 데이터는 `src/features/queries.ts` 의 훅으로만 다룬다.** 모바일의 같은 파일과 구조를 맞춰 두었다.
  - 돈이 움직이는 mutation 은 `invalidateMoney` 로 transactions·stats·budget·accounts 를 함께 무효화한다.
  - 가계부 하위 요청이 404 면 `query-client.ts` 가 books 를 다시 받는다(내보내졌거나 가계부가 삭제된 경우).
- **색은 토큰만 쓴다.** `src/theme/tokens.ts`(모바일과 같은 값) 를 `useApplyTheme` 이 `--bg`, `--text` … CSS 변수로 내보낸다.
  - 스타일·인라인 style 에서는 `var(--token)` 을 쓰고 hex 를 하드코딩하지 않는다(다크모드가 깨짐). 카테고리/계좌 색처럼 데이터로 오는 색은 예외.
  - 반투명 배경은 `tint(color, %)`(`color-mix`) 를 쓴다. `${color}26` 은 `var(--x)` 에서 깨진다.
- **아이콘은 `<Icon name="…" />`(`src/components/icon.tsx`).** 카테고리 아이콘은 서버에 Ionicons 이름 문자열로 저장되므로 모바일과 같은 이름 체계를 쓴다.
  - 번들 크기 때문에 쓰는 아이콘만 `ICONS` 에 등록한다. 없는 이름은 `help` 로 그려지니 새 아이콘(서버 기본 카테고리 포함)을 쓰면 꼭 추가한다.
  - 아웃라인 아이콘은 SVG 안에 넣은 스타일로 선을 그린다(마스크 이미지에는 바깥 CSS 가 닿지 않음).
- **모달 성격 화면(거래 입력 등)을 닫을 때는 `useCloseModal()`(`src/lib/nav.ts`).** 주소로 바로 열린 경우 `navigate(-1)` 은 앱 밖으로 나간다.
- **삭제·나가기 확인은 `confirm()`(`src/components/dialog.tsx`).** 브라우저 `window.confirm` 은 쓰지 않는다.
- **서비스워커는 앱 셸만 캐시한다. API 응답은 캐시하지 않는다** — 오래된 잔액·내역을 보여주면 안 되므로. 오프라인 데이터 지원을 넣을 때는 이 결정을 먼저 다시 검토한다.
  - 새 버전은 `registerType: 'prompt'` 로 사용자가 새로고침을 눌러야 적용된다(입력 중 데이터 보호).
- 홈 화면 앱으로 실행 중이 아니면 `InstallGate` 가 설치 안내를 먼저 띄운다. "브라우저에서 계속" 은 `sessionStorage` 에 남아 그 탭에서만 유지된다.
- 토큰은 `localStorage`(`src/lib/storage.ts`)에 둔다. refresh 토큰이 회전되므로 여러 탭에서 쓸 때를 위해 `refreshTokens` 가 저장소의 최신 토큰을 먼저 다시 읽는다.
- API 주소: `VITE_API_URL` → 없으면 `현재 호스트:3000/api/v1`. Tailscale serve 처럼 다른 포트(:8443)로 API 를 열면 빌드할 때 `VITE_API_URL` 을 지정해야 한다. HTTPS 페이지면 API 도 HTTPS 여야 한다(mixed content).

## 모바일 앱과 다른 점

UI 는 모바일과 같아야 한다(루트 "모바일·웹 UI 동기화"). 아래는 플랫폼 때문에 일부러 다르게 한 것만 적는다.

- 스와이프 삭제 없음 → 거래 수정 화면의 휴지통으로 삭제.
- 당겨서 새로고침 없음 → 탭으로 돌아오면(visibilitychange) 자동으로 다시 불러온다.
- 날짜는 브라우저 기본 날짜 입력, 진동은 `navigator.vibrate` 지원 브라우저(안드로이드)에서만.
- 초대 코드 공유는 Web Share API, 없으면(데스크톱) 클립보드 복사.
- 설치 안내(`InstallGate`)와 새 버전 알림(`UpdatePrompt`)은 웹에만 있다.
