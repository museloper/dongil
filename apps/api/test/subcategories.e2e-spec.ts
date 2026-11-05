import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AccountDto, AuthResponse, BookDto, BudgetDto, CategoryDto, CategoryStatDto, ImportanceStatDto, Paginated, TransactionDto } from '@dongil/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.module';
import { deleteUsers } from './cleanup';

describe('세부 카테고리 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `sub-${Date.now()}@test.local`;
  let token = '';
  let book: BookDto;
  let other: BookDto;
  let cash: AccountDto;
  let food: CategoryDto;
  let bus: CategoryDto;
  let cafe: CategoryDto;
  let salary: CategoryDto;
  let eatOut: CategoryDto;
  let groceries: CategoryDto;

  const api = () => request(app.getHttpServer());
  const authed = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const path = (p: string, bookId = book.id) => `/api/v1/books/${bookId}${p}`;
  const cats = async (bookId = book.id): Promise<CategoryDto[]> => (await authed(api().get(path('/categories', bookId)))).body;
  const addCategory = (body: object, bookId = book.id) =>
    authed(api().post(path('/categories', bookId))).send({ type: 'EXPENSE', icon: 'happy', color: '#112233', ...body });
  const patch = (id: string, body: object) => authed(api().patch(path(`/categories/${id}`))).send(body);
  const expense = (categoryId: string, amount: number, extra: object = {}) =>
    authed(api().post(path('/transactions'))).send({ type: 'EXPENSE', accountId: cash.id, categoryId, amount, occurredAt: '2026-09-10T03:00:00.000Z', ...extra });
  const byCategory = async (query: object = {}): Promise<CategoryStatDto[]> =>
    (await authed(api().get(path('/stats/by-category')).query({ month: '2026-09', ...query }))).body;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    token = ((await api().post('/api/v1/auth/signup').send({ email, password: 'password123', nickname: 's' })).body as AuthResponse).accessToken;
    book = (await authed(api().get('/api/v1/books'))).body[0];
    other = (await authed(api().post('/api/v1/books')).send({ name: '다른 가계부' })).body;
    cash = (await authed(api().get(path('/accounts')))).body[0];
    const list = await cats();
    const find = (name: string) => list.find((c) => c.name === name)!;
    food = find('식비');
    bus = find('교통');
    cafe = find('카페');
    salary = find('월급');
  });

  afterAll(async () => {
    await deleteUsers(prisma, [email]);
    await app.close();
  });

  it('세부 카테고리는 상위의 종류 안에서 만들고, 아이콘은 따로 갖고 색은 상위를 따른다', async () => {
    const res = await addCategory({ name: '외식', parentId: food.id });
    expect(res.status).toBe(201);
    eatOut = res.body;
    expect(eatOut).toMatchObject({ parentId: food.id, icon: 'happy', color: food.color, type: 'EXPENSE' });
    groceries = (await addCategory({ name: '장보기', parentId: food.id, icon: food.icon })).body;
    expect(food.parentId).toBeNull();
  });

  it('2단계를 넘거나 다른 종류·다른 가계부를 상위로 지정하면 400 이다', async () => {
    expect((await addCategory({ name: '세세부', parentId: eatOut.id })).status).toBe(400);
    expect((await addCategory({ name: '수입아래', parentId: salary.id })).status).toBe(400);
    const foreign = (await cats(other.id)).find((c) => c.name === '식비')!;
    expect((await addCategory({ name: '남의것', parentId: foreign.id })).status).toBe(400);
    expect((await addCategory({ name: '없는것', parentId: 'nope' })).status).toBe(400);
    // 세부가 있는 카테고리는 옮길 수 없고, 자기 자신이나 세부 아래로도 못 간다
    expect((await patch(food.id, { parentId: bus.id })).status).toBe(400);
    expect((await patch(bus.id, { parentId: bus.id })).status).toBe(400);
    expect((await patch(bus.id, { parentId: eatOut.id })).status).toBe(400);
  });

  it('기존 카테고리를 세부로 옮기면 아이콘은 유지하고 색만 상위를 따르며, 꺼내면 최상위가 된다', async () => {
    const moved = await patch(cafe.id, { parentId: food.id });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ parentId: food.id, icon: cafe.icon, color: food.color });
    const back = await patch(cafe.id, { parentId: null, icon: 'cafe', color: '#C08457' });
    expect(back.body).toMatchObject({ parentId: null, icon: 'cafe', color: '#C08457' });
  });

  it('세부의 색은 바꿀 수 없고, 상위를 바꾸면 같은 아이콘을 쓰던 세부만 아이콘이 따라 바뀐다', async () => {
    const own = await patch(eatOut.id, { name: '외식비', icon: 'cafe', color: '#000000' });
    expect(own.body).toMatchObject({ name: '외식비', icon: 'cafe', color: food.color });
    await patch(eatOut.id, { name: '외식' });

    await patch(food.id, { icon: 'beer', color: '#ABCDEF' });
    const list = await cats();
    expect(list.find((c) => c.id === eatOut.id)).toMatchObject({ icon: 'cafe', color: '#ABCDEF' });
    expect(list.find((c) => c.id === groceries.id)).toMatchObject({ icon: 'beer', color: '#ABCDEF' });
    await patch(food.id, { icon: food.icon, color: food.color });
    expect((await cats()).find((c) => c.id === groceries.id)).toMatchObject({ icon: food.icon, color: food.color });
  });

  describe('집계', () => {
    let list: TransactionDto[];

    beforeAll(async () => {
      expect((await expense(eatOut.id, 1000, { importance: 'A', memo: '파스타' })).status).toBe(201);
      await expense(eatOut.id, 2000);
      await expense(groceries.id, 4000, { importance: 'A' });
      await expense(food.id, 8000);
      await expense(bus.id, 100);
      list = (await authed(api().get(path('/transactions')))).body.items;
    });

    it('거래에 상위 이름이 함께 온다', () => {
      expect(list.find((t) => t.memo === '파스타')?.category).toMatchObject({ id: eatOut.id, name: '외식', parentName: '식비' });
      expect(list.find((t) => t.amount === 100)?.category).toMatchObject({ id: bus.id, parentName: null });
    });

    it('카테고리 통계는 세부를 상위로 합치고 세부 내역을 함께 준다', async () => {
      const rows = await byCategory();
      expect(rows.map((r) => [r.name, r.amount])).toEqual([['식비', 15000], ['교통', 100]]);
      expect(rows[0].children.map((c) => [c.categoryId, c.name, c.amount])).toEqual([
        [food.id, '식비', 8000],
        [groceries.id, '장보기', 4000],
        [eatOut.id, '외식', 3000],
      ]);
      expect(rows[0].children[2].ratio).toBeCloseTo(0.2);
      expect(rows[0].children.map((c) => c.icon)).toEqual([food.icon, food.icon, 'cafe']);
      expect(rows[0].ratio).toBeCloseTo(15000 / 15100);
      expect(rows[1].children).toEqual([]);
    });

    it('상위 조건은 세부까지 포함하고, 세부 조건은 그 세부만 본다', async () => {
      const importanceOf = async (categoryId: string): Promise<ImportanceStatDto[]> =>
        (await authed(api().get(path('/stats/by-importance')).query({ month: '2026-09', categoryId }))).body;
      expect((await importanceOf(food.id)).find((r) => r.importance === 'A')?.amount).toBe(5000);
      expect((await importanceOf(food.id)).find((r) => r.importance === null)?.amount).toBe(10000);
      expect((await importanceOf(eatOut.id)).find((r) => r.importance === 'A')?.amount).toBe(1000);
    });

    it('중요도 조건을 겹쳐도 세부만 있는 상위 줄이 나온다', async () => {
      const rows = await byCategory({ importance: 'A' });
      expect(rows.map((r) => [r.name, r.amount])).toEqual([['식비', 5000]]);
      expect(rows[0].children.map((c) => c.name)).toEqual(['장보기', '외식']);
    });

    it('거래 목록은 상위로 찾으면 세부까지, 검색은 상위 이름으로도 찾는다', async () => {
      const find = async (query: object) => ((await authed(api().get(path('/transactions')).query(query))).body as Paginated<TransactionDto>).items;
      expect(await find({ categoryId: food.id })).toHaveLength(4);
      expect(await find({ categoryId: eatOut.id })).toHaveLength(2);
      expect((await find({ q: '식비' })).length).toBe(4);
    });

    it('상위 예산 사용액에 세부 지출이 들어가고, 세부에도 예산을 둘 수 있다', async () => {
      const res = await authed(api().put(path('/budgets'))).send({
        month: '2026-09',
        items: [{ categoryId: food.id, amount: 30000 }, { categoryId: eatOut.id, amount: 6000 }],
      });
      const items = (res.body as BudgetDto).items;
      expect(items.find((i) => i.categoryId === food.id)).toMatchObject({ spent: 15000, ratio: 0.5 });
      expect(items.find((i) => i.categoryId === eatOut.id)).toMatchObject({ spent: 3000, ratio: 0.5 });
    });

    it('CSV 는 카테고리 열에 상위, 세부카테고리 열에 세부를 쓴다', async () => {
      const res = await authed(api().get(path('/export/csv')).query({ from: '2026-09-01T00:00:00+09:00', to: '2026-10-01T00:00:00+09:00' }));
      const lines = res.text.split('\r\n');
      const pasta = lines.find((l) => l.includes('파스타'))!;
      expect(pasta.split(',')[2]).toBe('식비');
      expect(pasta.endsWith(',외식')).toBe(true);
    });

    it('상위를 삭제하면 세부도 숨겨지지만 과거 거래와 통계에는 남는다', async () => {
      expect((await authed(api().delete(path(`/categories/${food.id}`)))).status).toBe(204);
      const names = (await cats()).map((c) => c.name);
      expect(names).not.toContain('식비');
      expect(names).not.toContain('외식');
      expect(names).not.toContain('장보기');
      expect((await addCategory({ name: '숨긴곳', parentId: food.id })).status).toBe(400);
      expect((await byCategory())[0]).toMatchObject({ name: '식비', amount: 15000 });
    });
  });
});
