# 돈길 (dongil)

개인 가계부. Expo 모바일 앱, PWA 웹앱, NestJS API, PostgreSQL 로 구성된 pnpm 모노레포.

```
apps/mobile      Expo SDK 57 (RN 0.86, Expo Router, Reanimated 4, TanStack Query, Zustand, react-native-svg)
apps/web         PWA · Vite 8 + React 19 (react-router 7, TanStack Query, Zustand, vite-plugin-pwa)
apps/api         NestJS 11 + Prisma 6 + PostgreSQL 16
packages/shared  앱·서버 공용 Zod 스키마, DTO 타입, 금액/날짜 유틸 (@dongil/shared)
```

## 명령어

```bash
pnpm install                          # 루트에서. 의존성 추가는 각 패키지 폴더에서
pnpm db:up                            # Postgres 컨테이너 (dongil-db-1, 5432)
pnpm --filter @dongil/shared build    # shared 를 고치면 API 실행/테스트 전에 반드시 다시 빌드
cd apps/api
  pnpm dev                            # http://localhost:3000/api/v1, Swagger /api/docs
  pnpm test                           # 단위
  pnpm test:e2e                       # 실제 DB 사용 (DB 가 떠 있어야 함)
  npx prisma migrate dev --name <이름>  # 스키마 변경 시
cd apps/mobile
  npx expo start                      # Expo Go / w 로 웹 미리보기 (8081)
  npx expo install <pkg>              # 모바일 의존성은 반드시 이걸로 (SDK 호환 버전)
  npx tsc --noEmit && npx expo lint   # 작업 끝나면 둘 다 통과시킬 것
cd apps/web
  pnpm dev                            # http://localhost:5173 (--host 라 LAN 에도 열림)
  pnpm lint && pnpm build             # build 가 tsc 까지 돌린다
  pnpm preview                        # 서비스워커·설치 확인은 빌드 결과로
```

변경 후 최소 검증: shared 빌드, API `test` + `test:e2e`, mobile `tsc` + `lint`, web `lint` + `build`.
화면을 바꿨다면 모바일은 웹 미리보기, 웹은 브라우저(모바일 폭)로 직접 확인한다.

## 문서 지도

| 작업 | 문서 |
|---|---|
| 모바일 화면·Expo API | `apps/mobile/AGENTS.md` + 아래 "모바일 규칙" |
| 웹(PWA) 화면·서비스워커·아이콘 | `apps/web/CLAUDE.md` |
| 모바일·웹 중 한쪽 UI 를 고칠 때 | 아래 "모바일·웹 UI 동기화" |
| 배포·포트·Tailscale | `README.md` 의 배포 절 |

## 도메인 규칙 (깨지면 데이터가 틀어짐)

- **금액은 원 단위 정수.** DB 는 `BigInt`, 응답 직전에 `common/mappers.ts` 에서 number 로 바꾼다. 소수는 쓰지 않는다.
- **계좌 잔액은 거래와 같은 DB 트랜잭션 안에서 갱신한다.**
  - 증감은 `transactions/balance.ts` 의 `balanceDeltas`/`mergeDeltas` 로만 계산한다.
  - 수정은 "이전 거래 원복 + 새 거래 적용"으로 처리한다.
  - 잔액 로직을 바꾸면 e2e 의 잔액 정합성 테스트도 갱신한다.
- **월·일 경계는 KST(UTC+9) 기준.** DB 는 UTC 로 저장한다.
  - shared 의 `monthRange`, `toLocalDateKey` 를 쓴다.
  - raw SQL 에서는 `"occurredAt" + interval '9 hours'` 로 묶는다(`stats.service.ts`).
- **입력 검증은 shared 의 Zod 스키마 하나로 한다.**
  - 서버는 `ZodPipe`, 앱 폼은 `safeParse` 로 같은 스키마를 쓴다.
  - 새 규칙은 shared 에 추가하고 양쪽에 중복 작성하지 않는다.
- **돈 데이터는 사용자가 아니라 가계부(`Book`)에 귀속된다.**
  - 계좌·카테고리·거래·예산은 모두 `bookId` 를 갖는다.
  - 가입하면 개인 가계부(PERSONAL)가 자동으로 생긴다. 공유 가계부(SHARED)는 최대 2명(`BOOK_MAX_MEMBERS`)이다.
  - 가계부 하위 API 는 `books/:bookId/...` 경로를 쓰고, 컨트롤러에 `@UseGuards(BookAccessGuard)` 를 붙인다.
  - 서비스에는 `@BookId()` 로 받은 id 만 넘기고, 모든 쿼리를 `where: { bookId }` 로 제한한다.
  - 비멤버의 접근은 404 다. 존재 여부를 숨기기 위해서다.
  - 다른 가계부의 계좌·카테고리 id 가 들어오면 400 으로 거부한다.
- **거래에는 작성자(`createdById`)를 남긴다.** 수정해도 원래 작성자를 유지한다.
- **가계부 규칙**(`books.service.ts`)
  - OWNER 만 가계부를 삭제하거나 멤버를 내보낼 수 있다. OWNER 는 나갈 수 없다.
  - 개인 가계부는 삭제할 수 없고, 초대도 받을 수 없다.
  - 초대 코드는 6자리이고 24시간 동안 1회만 쓸 수 있다. 재발급하면 이전 코드는 무효가 된다.
  - 참여할 때 정원 확인은 Serializable 트랜잭션 안에서 한다.
  - `Book` 은 사용자 삭제에 cascade 되지 않는다. 테스트 정리는 `test/cleanup.ts` 의 `deleteUsers` 를 쓴다.
- **계좌와 카테고리는 삭제하지 않고 `archived` 로 숨긴다.** 과거 거래가 참조하기 때문이다.
- **인증:** 전역 `AuthGuard` 가 기본으로 적용된다. 공개 엔드포인트만 `@Public()` 을 붙인다.
  - Access 토큰 15분, Refresh 토큰 14일이며, refresh 할 때마다 회전하고 재사용을 막는다.

## 모바일 규칙

- `apps/mobile/AGENTS.md` 를 따른다. Expo 는 SDK 마다 API 가 바뀌므로, 기억에 의존하지 말고 v57 문서를 확인한다.
- 라우트 파일은 `src/app/` 에만 둔다. 컴포넌트·훅·유틸은 그 밖에 두고, 라우트 파일에서 일반 export 를 하지 않는다.
- **색은 `useTheme().colors` 토큰만 쓴다(`src/theme/tokens.ts`).** 하드코딩한 hex 는 다크모드를 깨뜨린다.
- **서버 데이터는 `src/features/queries.ts` 의 훅으로 다룬다.**
  - 돈이 움직이는 mutation 은 `invalidateMoney` 로 transactions·stats·budget·accounts 캐시를 함께 무효화한다.
  - 가계부 하위 훅은 `useBookId()` 와 `bookPath()` 를 쓰고, queryKey 두 번째 자리에 bookId 를 넣는다(`['accounts', bookId]`).
  - 현재 가계부는 `useCurrentBook()` 으로 얻는다. 선택은 `src/lib/book-store.ts` 에 있고, 목록에 없으면 개인 가계부로 대체된다.
  - 가계부 하위 요청이 404 면 `query-client.ts` 가 books 를 다시 받는다. 상대가 나를 내보냈거나 가계부를 삭제한 경우다.
- **모달을 닫을 때는 `closeModal()`(`src/lib/nav.ts`)을 쓴다.** `router.back()` 은 딥링크로 열린 모달에서 동작하지 않는다.
- 토큰 저장은 `src/lib/storage.ts` 를 쓴다. 네이티브는 SecureStore, `.web.ts` 는 localStorage 다.
- 날짜 선택은 `@react-native-community/datetimepicker` v9 를 쓴다. `onChange` 는 deprecated 이므로 `onValueChange`/`onDismiss` 를 쓴다.

## 웹 규칙 (요약, 상세는 `apps/web/CLAUDE.md`)

- shared 는 workspace 로 쓰되 Vite·tsconfig 가 `packages/shared/src` **소스**를 바로 읽는다(dist 는 CommonJS 라 Vite 에서 못 씀). shared 빌드 없이도 웹은 동작한다.
- 색은 `tokens.ts` 를 CSS 변수(`var(--token)`)로만 쓴다. 아이콘은 `<Icon>` 에 등록된 Ionicons 이름만 그려진다.
- 서비스워커는 앱 셸만 캐시하고 API 응답은 캐시하지 않는다(오래된 잔액 방지).

## 모바일·웹 UI 동기화

사용자는 모바일 앱과 웹을 같은 서비스로 쓰므로 화면이 어긋나면 안 된다.

- **UI/UX 변경은 `apps/mobile` 과 `apps/web` 에 같은 커밋(또는 같은 PR)으로 함께 반영한다.** 한쪽만 고치고 끝내지 않는다.
  - 대상: 화면 구성·흐름, 문구, 새 화면·기능, 색 토큰(두 `tokens.ts` 값이 같아야 함), 아이콘·카테고리 아이콘 선택지, 빈/에러 상태.
  - 이번에 한쪽을 못 하면 이슈를 남긴다.
- 플랫폼 특성 때문에 일부러 다르게 한 부분은 `apps/web/CLAUDE.md` 의 "모바일 앱과 다른 점"에 적는다. 거기 없는 차이는 동기화 누락으로 본다.
- 파일 대응(모바일 ↔ 웹):
  - `src/app/(tabs)/<탭>.tsx` ↔ `src/pages/<탭>.tsx` (홈 `index.tsx` ↔ `home.tsx`)
  - `src/app/<이름>.tsx` ↔ `src/pages/<이름>.tsx`, `(auth)/*` ↔ `auth.tsx`, `transaction/*` ↔ `transaction.tsx`
  - `src/components/*` ↔ 같은 이름 (`auth-form` ↔ `auth-shell`), `src/features/queries.ts`·`src/lib/*` ↔ 같은 경로
  - 웹 전용(대응 없음): `dialog`, `icon`, `install-gate`, `update-prompt`

## 환경 함정

- **5432 포트 충돌:** 로컬에 `postgresql-x64-18` 서비스(자동 시작)가 설치되어 있다. 켜져 있으면 API 가 엉뚱한 DB 로 붙어 `P1000` 인증 오류가 난다.
- `docker` 가 PATH 에 없으면 `C:\Program Files\Docker\Docker\resources\bin`(또는 `C:\Users\jisuzzxng\AppData\Local\Programs\DockerDesktop\resources\bin`)을 추가한다.
- **운영 API 컨테이너(`dongil-api-1`)가 3000 을 쓴다.** `pnpm dev` 전에 `docker compose stop api`, 끝나면 `docker compose --profile prod up -d`.
- **pnpm 10 은 설치 스크립트를 막는다.** Prisma 처럼 빌드가 필요한 패키지는 루트 `package.json` 의 `pnpm.onlyBuiltDependencies` 에 추가한다.
- `.npmrc` 의 `node-linker=hoisted` 는 Expo 호환 때문에 필요하다. 지우지 않는다.
- **React 는 모노레포에 한 벌만 있어야 한다.** 버전은 Expo SDK 가 정하므로 `apps/web` 의 `react`·`react-dom`·`@types/react` 를 `apps/mobile` 과 같은 값으로 고정한다. Expo SDK 를 올리면 웹도 같이 맞춘다.
  - 같은 이유로 웹의 react-router 는 7 을 쓴다(8 은 react 19.2.7 이상 요구).
- **웹 미리보기 한정 현상:**
  - Reanimated `AnimatedPressable` 이 `aria-label` 을 버린다.
  - react-native-svg 의 `transform-origin` 경고가 개발 모드에서 뜬다.
  - 둘 다 네이티브와는 무관하다.

## 보안 정책

- `.env` 는 커밋하지 않는다. 기본값은 `apps/api/.env.example` 에 둔다. 운영에서는 JWT 시크릿을 반드시 교체한다.

## 미구현 (2차)

정기 거래 자동 등록(`RecurringRule` 테이블만 있음), 예산 초과 푸시 알림, 생체인증 잠금, 홈 위젯.

---

# 전역 개발 규칙

(사용자 전역 규칙(`~/.claude/CLAUDE.md`)의 복사본. 다른 기기에서도 보이도록 저장소에 둔다. 프로젝트에 국한되지 않는 새 규칙이 생기면 여기와 전역 파일 양쪽에 반영한다.)

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
