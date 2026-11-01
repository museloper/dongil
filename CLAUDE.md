# 돈길 웹 (dongil-web)

돈길 가계부의 PWA(설치형 웹앱) 버전. 서버는 별도 저장소 [museloper/dongil](https://github.com/museloper/dongil) 의 NestJS API 를 그대로 쓰고, 이 저장소는 프론트엔드만 담는다.

```
Vite 8 + React 19 + TypeScript, react-router 8, TanStack Query 5, Zustand 5, zod 3, vite-plugin-pwa (Workbox)
```

## 명령어

```bash
npm install
npm run dev            # http://localhost:5173 (--host 로 LAN 노출: 폰에서 PC IP:5173 접속)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # 타입체크 + 프로덕션 빌드 (dist/, 서비스워커 포함)
npm run preview        # 빌드 결과 서빙 (서비스워커·설치는 여기서 확인)
npm run sync-shared    # ../dongil/packages/shared/src → src/shared 복사
npm run generate-icons # public/logo.svg → PWA 아이콘 PNG 재생성
```

변경 후 최소 검증: `npm run lint` + `npm run build`. 화면을 바꿨다면 브라우저(모바일 폭)로 직접 확인한다.
API 는 dongil 저장소에서 `pnpm db:up` 후 `apps/api` 에서 `pnpm dev` 로 띄운다.

## 놓치면 버그가 되는 규칙

- **`src/shared/` 는 dongil 의 `packages/shared/src` 복사본이다. 직접 고치지 않는다.**
  - 스키마·DTO·금액/날짜 유틸을 바꿀 때는 dongil 쪽을 고친 뒤 `npm run sync-shared` 로 가져온다.
  - 입력 검증은 서버와 같은 Zod 스키마(`safeParse`)로 한다. 새 규칙을 화면 코드에 따로 만들지 않는다.
- **도메인 규칙은 서버와 같다** (자세한 것은 dongil 의 CLAUDE.md).
  - 금액은 원 단위 정수. 월·일 경계는 KST(UTC+9) — `monthRange`, `toLocalDateKey`, `src/lib/date.ts` 를 쓴다.
  - 돈 데이터는 가계부(`Book`) 단위. 가계부 하위 요청은 `bookPath(bookId, …)`, queryKey 두 번째 자리에 bookId.
- **서버 데이터는 `src/features/queries.ts` 의 훅으로만 다룬다.** 모바일 앱의 같은 파일과 구조를 맞춰 두었다.
  - 돈이 움직이는 mutation 은 `invalidateMoney` 로 transactions·stats·budget·accounts 를 함께 무효화한다.
  - 가계부 하위 요청이 404 면 `query-client.ts` 가 books 를 다시 받는다(내보내졌거나 가계부가 삭제된 경우).
- **색은 토큰만 쓴다.** `src/theme/tokens.ts` 값을 `useApplyTheme` 이 `--bg`, `--text` … CSS 변수로 내보낸다.
  - 스타일·인라인 style 에서는 `var(--token)` 을 쓰고 hex 를 하드코딩하지 않는다(다크모드가 깨짐). 카테고리/계좌 색처럼 데이터로 오는 색은 예외.
  - 반투명 배경은 `tint(color, %)`(`color-mix`) 를 쓴다. `${color}26` 은 `var(--x)` 에서 깨진다.
- **아이콘은 `<Icon name="…" />`(`src/components/icon.tsx`).** 카테고리 아이콘은 서버에 Ionicons 이름 문자열로 저장되므로 모바일과 같은 이름 체계를 쓴다.
  - 번들 크기 때문에 쓰는 아이콘만 `ICONS` 에 등록한다. 없는 이름은 `help` 로 그려지니 새 아이콘을 쓰면 꼭 추가한다.
  - 아웃라인 아이콘은 SVG 안에 넣은 스타일로 선을 그린다(마스크 이미지에는 바깥 CSS 가 닿지 않음).
- **모달 성격 화면(거래 입력 등)을 닫을 때는 `useCloseModal()`(`src/lib/nav.ts`).** 주소로 바로 열린 경우 `navigate(-1)` 은 앱 밖으로 나간다.
- **삭제·나가기 확인은 `confirm()`(`src/components/dialog.tsx`).** 브라우저 `window.confirm` 은 쓰지 않는다.
- **서비스워커는 앱 셸만 캐시한다. API 응답은 캐시하지 않는다** — 오래된 잔액·내역을 보여주면 안 되므로. 오프라인 데이터 지원을 넣을 때는 이 결정을 먼저 다시 검토한다.
  - 새 버전은 `registerType: 'prompt'` 로 사용자가 새로고침을 눌러야 적용된다(입력 중 데이터 보호).
- 토큰은 `localStorage`(`src/lib/storage.ts`)에 둔다. refresh 토큰이 회전되므로 여러 탭에서 쓸 때를 위해 `refreshTokens` 가 저장소의 최신 토큰을 먼저 다시 읽는다.
- API 주소: `VITE_API_URL` → 없으면 `현재 호스트:3000/api/v1`. HTTPS 로 배포하면 API 도 HTTPS 여야 한다(mixed content).

## 모바일 앱과 다른 점

- 스와이프 삭제 없음 → 거래 수정 화면의 휴지통으로 삭제.
- 당겨서 새로고침 없음 → 탭으로 돌아오면(visibilitychange) 자동으로 다시 불러온다.
- 날짜는 브라우저 기본 날짜 입력, 진동은 `navigator.vibrate` 지원 브라우저(안드로이드)에서만.
- 초대 코드 공유는 Web Share API, 없으면(데스크톱) 클립보드 복사.

---

# 전역 개발 규칙

(사용자 전역 규칙의 복사본. 프로젝트에 국한되지 않는 새 규칙이 생기면 여기와 전역 파일 양쪽에 반영한다.)

## 커밋 컨벤션

**Conventional Commits**를 따른다. 커밋 메시지를 작성/생성할 때 항상 지킬 것.

- 형식: `<type>(<scope>): <subject>` — scope는 선택.
- type: `feat`(기능 추가) · `fix`(버그 수정) · `docs`(문서만 변경) · `test`(테스트만 추가/수정) · `refactor`(동작 변화 없는 구조 변경) · `chore`(빌드/설정/의존성) · `style`(포매팅) · `perf`(성능) 중 하나.
- subject는 소문자로 시작하는 명령형 한 줄, 끝에 마침표 없음.
- 본문(body)은 "무엇을 바꿨는지"가 아니라 **"왜 바꿨는지"**를 설명할 때만 추가한다 — diff를 보면 무엇이 바뀌었는지는 이미 알 수 있다.

## 커밋 전 검증

커밋하기 전에 해당 프로젝트의 typecheck·lint·test가 통과하는 상태여야 한다. 프로젝트마다 정확한 명령어는 다르므로(`npx tsc --noEmit` / `npm run lint` / `npx vitest run` 등), 그 프로젝트의 CLAUDE.md·package.json scripts·CI 설정에서 실제 명령어를 확인해 실행할 것.

## 이슈 정리

이슈를 닫기 전에 하위 이슈(sub-issue) 상태를 확인한다(`gh api repos/{owner}/{repo}/issues/{n}/sub_issues`). 하위가 하나라도 열려 있으면 상위는 닫지 않는다. 해결 근거를 코드·커밋에서 확인하지 못한 이슈는 닫지 말고 사용자에게 묻는다.

## PR 작성

- **Assignees**에 PR 작성자, **Reviewers**에 작성자를 뺀 팀원(쓰기 권한자) 전원을 지정한다.
- 종류(feat/fix/…)와 영역 **Labels**를 붙이고, 관련 이슈는 본문에 `Closes #n`으로 써서 **Development**에 연결한다. 팀이 GitHub Projects를 쓰면 **Projects**에도 넣는다.
- 저장소에 이를 자동으로 해 주는 워크플로가 있어도 `gh pr create`로 직접 올릴 때는 `--assignee @me --reviewer … --label …`로 직접 채운다 — `pull_request_target` 워크플로는 base 브랜치의 파일로 돌기 때문에 스택 PR 등에서는 돌지 않는다.
- PR 템플릿이 있으면 그 섹션 구조를 따르고, 하지 않은 테스트는 체크하지 않으며 확인하지 못한 것을 적는다.

## 프로젝트 CLAUDE.md 계층

- 루트 CLAUDE.md는 매 세션 통째로 로드된다. 전역 규칙과 "놓치면 버그가 되는" 한 줄 요약만 두고 길이를 지킨다.
- 기능별 상세는 그 디렉토리의 CLAUDE.md에 두고, 루트에 **문서 지도**(어떤 작업 → 어떤 문서)를 둔다.
- 하위 CLAUDE.md는 그 디렉토리의 파일을 열 때만 로드된다. 다른 디렉토리(lib, composables 등)에서 그 기능을 건드릴 때 놓치지 않도록 루트에 요약과 경로를 남긴다.
- 코드·git 이력으로 알 수 있는 것은 적지 않는다. 코드로 알 수 없는 "왜"와 도메인 룰만 적는다.
