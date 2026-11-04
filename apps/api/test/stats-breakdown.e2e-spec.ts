import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AccountDto, AuthResponse, BookDto, CategoryDto, CategoryStatDto, ImportanceStatDto, TagStatDto } from '@dongil/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.module';
import { deleteUsers } from './cleanup';

describe('중요도·카테고리·태그 통계 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `stats-${Date.now()}@test.local`;
  let token = '';
  let book: BookDto;
  let cash: AccountDto;
  let bank: AccountDto;
  let food: CategoryDto;
  let bus: CategoryDto;
  let jeju: string;

  const api = () => request(app.getHttpServer());
  const authed = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const path = (p: string, bookId = book.id) => `/api/v1/books/${bookId}${p}`;
  const stat = async <T>(name: string, query: object = {}, status = 200): Promise<T> => {
    const res = await authed(api().get(path(`/stats/${name}`)).query({ month: '2026-09', ...query }));
    expect(res.status).toBe(status);
    return res.body;
  };
  const expense = (body: object) =>
    authed(api().post(path('/transactions'))).send({ type: 'EXPENSE', accountId: cash.id, occurredAt: '2026-09-10T03:00:00.000Z', ...body });
  const amounts = (rows: ImportanceStatDto[]) => rows.map((r) => [r.importance, r.amount]);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    token = ((await api().post('/api/v1/auth/signup').send({ email, password: 'password123', nickname: 's' })).body as AuthResponse).accessToken;
    book = (await authed(api().get('/api/v1/books'))).body[0];
    cash = (await authed(api().get(path('/accounts')))).body[0];
    bank = (await authed(api().post(path('/accounts'))).send({ name: '은행', type: 'BANK' })).body;
    const cats: CategoryDto[] = (await authed(api().get(path('/categories')))).body;
    food = cats.find((c) => c.name === '식비')!;
    bus = cats.find((c) => c.name === '교통')!;

    await expense({ amount: 1000, categoryId: food.id, importance: 'A', tags: ['제주'] });
    await expense({ amount: 2000, categoryId: food.id, importance: 'B' });
    await expense({ amount: 4000, categoryId: bus.id, importance: 'A', tags: ['제주', '가족'] });
    await expense({ amount: 8000, categoryId: food.id, accountId: bank.id });
    // 집계에서 빠져야 하는 것: 수입, 다른 달
    await authed(api().post(path('/transactions'))).send({
      type: 'INCOME', amount: 99999, accountId: cash.id, categoryId: cats.find((c) => c.name === '월급')!.id, occurredAt: '2026-09-10T03:00:00.000Z',
    });
    await expense({ amount: 16000, categoryId: food.id, importance: 'A', tags: ['제주'], occurredAt: '2026-08-31T14:59:00.000Z' });
    // KST 로 9월 1일 00:00 이므로 9월에 들어간다
    await expense({ amount: 32000, categoryId: bus.id, importance: 'C', occurredAt: '2026-08-31T15:00:00.000Z' });

    const tags: { id: string; name: string }[] = (await authed(api().get(path('/tags')))).body;
    jeju = tags.find((t) => t.name === '제주')!.id;
  });

  afterAll(async () => {
    await deleteUsers(prisma, [email]);
    await app.close();
  });

  it('중요도별 합계를 A, B, C, 미지정 순서로 빠짐없이 준다', async () => {
    const rows = await stat<ImportanceStatDto[]>('by-importance');
    expect(amounts(rows)).toEqual([['A', 5000], ['B', 2000], ['C', 32000], [null, 8000]]);
    expect(rows[0].ratio).toBeCloseTo(5000 / 47000);
  });

  it('카테고리와 겹쳐 중요도 비중을 본다', async () => {
    const rows = await stat<ImportanceStatDto[]>('by-importance', { categoryId: food.id });
    expect(amounts(rows)).toEqual([['A', 1000], ['B', 2000], ['C', 0], [null, 8000]]);
  });

  it('중요도와 겹쳐 카테고리 비중을 본다', async () => {
    const rows = await stat<CategoryStatDto[]>('by-category', { importance: 'A' });
    expect(rows.map((r) => [r.name, r.amount, r.ratio])).toEqual([['교통', 4000, 0.8], ['식비', 1000, 0.2]]);
    const none = await stat<CategoryStatDto[]>('by-category', { importance: 'NONE' });
    expect(none.map((r) => [r.name, r.amount])).toEqual([['식비', 8000]]);
  });

  it('태그별 합계를 큰 순서로 주고, 태그가 여러 개면 태그마다 더한다', async () => {
    const rows = await stat<TagStatDto[]>('by-tag');
    expect(rows.map((r) => [r.name, r.amount, r.count])).toEqual([['제주', 5000, 2], ['가족', 4000, 1]]);
    expect(rows[0].ratio).toBeCloseTo(5000 / 47000);
  });

  it('중요도·카테고리·태그를 동시에 겹칠 수 있다', async () => {
    expect((await stat<TagStatDto[]>('by-tag', { importance: 'A', categoryId: food.id })).map((r) => [r.name, r.amount, r.ratio])).toEqual([['제주', 1000, 1]]);
    expect(amounts(await stat<ImportanceStatDto[]>('by-importance', { tagId: jeju, categoryId: bus.id }))).toEqual([['A', 4000], ['B', 0], ['C', 0], [null, 0]]);
    expect((await stat<CategoryStatDto[]>('by-category', { tagId: jeju, importance: 'A' })).map((r) => [r.name, r.amount])).toEqual([['교통', 4000], ['식비', 1000]]);
  });

  it('계좌 선택도 함께 적용된다', async () => {
    expect(amounts(await stat<ImportanceStatDto[]>('by-importance', { accountId: bank.id }))).toEqual([['A', 0], ['B', 0], ['C', 0], [null, 8000]]);
    expect(await stat('by-tag', { accountId: bank.id })).toEqual([]);
  });

  it('비율은 지출이 없어도 0 이고, 잘못된 중요도는 거부한다', async () => {
    const rows = await stat<ImportanceStatDto[]>('by-importance', { month: '2026-01' });
    expect(rows.every((r) => r.amount === 0 && r.ratio === 0)).toBe(true);
    await stat('by-category', { importance: 'D' }, 400);
  });

  it('다른 가계부의 카테고리·태그로는 아무것도 보이지 않는다', async () => {
    const other: BookDto = (await authed(api().post('/api/v1/books')).send({ name: '다른 가계부' })).body;
    const q = { month: '2026-09', tagId: jeju };
    expect((await authed(api().get(path('/stats/by-category', other.id)).query(q))).body).toEqual([]);
    const rows = (await authed(api().get(path('/stats/by-importance', other.id)).query({ month: '2026-09', categoryId: food.id }))).body;
    expect(rows.every((r: ImportanceStatDto) => r.amount === 0)).toBe(true);
    expect((await authed(api().get(path('/stats/by-tag', other.id)).query(q))).body).toEqual([]);
  });

  it('비멤버는 404 다', async () => {
    const stranger = `stats-x-${Date.now()}@test.local`;
    const res = await api().post('/api/v1/auth/signup').send({ email: stranger, password: 'password123', nickname: 'x' });
    const got = await api().get(path('/stats/by-tag')).query({ month: '2026-09' }).set('Authorization', `Bearer ${(res.body as AuthResponse).accessToken}`);
    expect(got.status).toBe(404);
    await deleteUsers(prisma, [stranger]);
  });
});
