# 돈길 (dongil)

개인 가계부. Expo 모바일 앱과 NestJS API, PostgreSQL 로 구성된 pnpm 모노레포.

```
apps/mobile      Expo SDK 57 (RN 0.86, Expo Router, Reanimated 4, TanStack Query, Zustand, react-native-svg)
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
```

변경 후 최소 검증: shared 빌드, API `test` + `test:e2e`, mobile `tsc` + `lint`.
화면을 바꿨다면 웹 미리보기로 직접 확인한다.

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

## 환경 함정

- **5432 포트 충돌:** 로컬에 `postgresql-x64-18` 서비스(자동 시작)가 설치되어 있다. 켜져 있으면 API 가 엉뚱한 DB 로 붙어 `P1000` 인증 오류가 난다.
- `docker` 가 PATH 에 없으면 `C:\Users\jisuzzxng\AppData\Local\Programs\DockerDesktop\resources\bin` 을 추가한다.
- **pnpm 10 은 설치 스크립트를 막는다.** Prisma 처럼 빌드가 필요한 패키지는 루트 `package.json` 의 `pnpm.onlyBuiltDependencies` 에 추가한다.
- `.npmrc` 의 `node-linker=hoisted` 는 Expo 호환 때문에 필요하다. 지우지 않는다.
- **웹 미리보기 한정 현상:**
  - Reanimated `AnimatedPressable` 이 `aria-label` 을 버린다.
  - react-native-svg 의 `transform-origin` 경고가 개발 모드에서 뜬다.
  - 둘 다 네이티브와는 무관하다.

## 보안 정책

- `.env` 는 커밋하지 않는다. 기본값은 `apps/api/.env.example` 에 둔다. 운영에서는 JWT 시크릿을 반드시 교체한다.

## 미구현 (2차)

정기 거래 자동 등록(`RecurringRule` 테이블만 있음), 예산 초과 푸시 알림, 생체인증 잠금, 홈 위젯.
