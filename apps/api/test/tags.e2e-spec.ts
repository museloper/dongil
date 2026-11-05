import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AccountDto, AuthResponse, BookDto, CategoryDto, Paginated, TagDto, TransactionDto } from '@dongil/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.module';
import { deleteUsers } from './cleanup';

describe('중요도와 태그 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const emails = ['a', 'b'].map((n) => `tag-${n}-${stamp}@test.local`);
  const tokens: Record<'a' | 'b', string> = { a: '', b: '' };
  let book: BookDto;
  let account: AccountDto;
  let food: CategoryDto;
  let salary: CategoryDto;

  const api = () => request(app.getHttpServer());
  const as = (who: 'a' | 'b', req: request.Test) => req.set('Authorization', `Bearer ${tokens[who]}`);
  const path = (p: string, bookId = book.id) => `/api/v1/books/${bookId}${p}`;
  const expense = (extra: object = {}) => ({
    type: 'EXPENSE',
    amount: 10000,
    accountId: account.id,
    categoryId: food.id,
    occurredAt: '2026-11-04T03:00:00.000Z',
    ...extra,
  });
  const createTx = async (extra: object = {}): Promise<TransactionDto> => {
    const res = await as('a', api().post(path('/transactions'))).send(expense(extra));
    expect(res.status).toBe(201);
    return res.body;
  };
  const tags = async (): Promise<TagDto[]> => (await as('a', api().get(path('/tags')))).body;
  const balance = async (): Promise<number> => {
    const list: AccountDto[] = (await as('a', api().get(path('/accounts')))).body;
    return list.find((a) => a.id === account.id)!.balance;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    for (const [i, who] of (['a', 'b'] as const).entries()) {
      const res = await api().post('/api/v1/auth/signup').send({ email: emails[i], password: 'password123', nickname: who });
      tokens[who] = (res.body as AuthResponse).accessToken;
    }
    book = (await as('a', api().get('/api/v1/books'))).body[0];
    account = (await as('a', api().get(path('/accounts')))).body[0];
    const cats: CategoryDto[] = (await as('a', api().get(path('/categories')))).body;
    food = cats.find((c) => c.name === '식비')!;
    salary = cats.find((c) => c.name === '월급')!;
  });

  afterAll(async () => {
    await deleteUsers(prisma, emails);
    await app.close();
  });

  it('중요도와 태그를 달 수 있고, 태그의 # 과 중복은 정리된다', async () => {
    const tx = await createTx({ importance: 'A', tags: ['#여행', '여행', ' 가족 '] });
    expect(tx.importance).toBe('A');
    expect(tx.tags.map((t) => t.name)).toEqual(['가족', '여행']);
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });

  it('달지 않으면 비어 있다', async () => {
    const tx = await createTx();
    expect(tx).toMatchObject({ importance: null, tags: [] });
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });

  it('잘못된 중요도와 태그는 거부한다', async () => {
    const send = (extra: object) => as('a', api().post(path('/transactions'))).send(expense(extra));
    expect((await send({ importance: 'D' })).status).toBe(400);
    expect((await send({ tags: ['###'] })).status).toBe(400);
    expect((await send({ tags: ['가'.repeat(21)] })).status).toBe(400);
    expect((await send({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).status).toBe(400);
  });

  it('수입과 이체에는 달 수 없다', async () => {
    const income = { type: 'INCOME', categoryId: salary.id };
    expect((await as('a', api().post(path('/transactions'))).send(expense({ ...income, importance: 'A' }))).status).toBe(400);
    expect((await as('a', api().post(path('/transactions'))).send(expense({ ...income, tags: ['보너스'] }))).status).toBe(400);
  });

  it('태그별 건수·합계를 많이 쓴 순서로 보여주고, 태그로 모아 볼 수 있다', async () => {
    const t1 = await createTx({ amount: 1000, tags: ['제주'] });
    const t2 = await createTx({ amount: 2000, tags: ['제주', '렌터카'], occurredAt: '2026-01-15T03:00:00.000Z' });

    const list = await tags();
    expect(list.map(({ name, count, total }) => ({ name, count, total }))).toEqual([
      { name: '제주', count: 2, total: 3000 },
      { name: '렌터카', count: 1, total: 2000 },
    ]);

    const jeju = list[0];
    const page: Paginated<TransactionDto> = (await as('a', api().get(path('/transactions')).query({ tagId: jeju.id }))).body;
    expect(page.items.map((t) => t.id)).toEqual([t1.id, t2.id]);

    const search: Paginated<TransactionDto> = (await as('a', api().get(path('/transactions')).query({ q: '렌터' }))).body;
    expect(search.items.map((t) => t.id)).toEqual([t2.id]);

    // 지운 거래는 집계에서 빠지고, 쓰는 거래가 없어진 태그는 목록에서 사라진다
    await as('a', api().delete(path(`/transactions/${t2.id}`)));
    expect((await tags()).map(({ name, total }) => ({ name, total }))).toEqual([{ name: '제주', total: 1000 }]);
    await as('a', api().delete(path(`/transactions/${t1.id}`)));
    expect(await tags()).toEqual([]);
  });

  it('수정할 때 값을 바꾸거나 지울 수 있다', async () => {
    const tx = await createTx({ importance: 'A', tags: ['가', '나'] });
    const changed = await as('a', api().put(path(`/transactions/${tx.id}`))).send(expense({ importance: 'C', tags: ['나', '다'] }));
    expect(changed.body.importance).toBe('C');
    expect(changed.body.tags.map((t: TagDto) => t.name)).toEqual(['나', '다']);

    const cleared = await as('a', api().put(path(`/transactions/${tx.id}`))).send(expense({ importance: null, tags: [] }));
    expect(cleared.body).toMatchObject({ importance: null, tags: [] });
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });

  it('필드를 보내지 않는 이전 버전 앱이 수정해도 값이 유지된다', async () => {
    const tx = await createTx({ importance: 'B', tags: ['유지'] });
    const res = await as('a', api().put(path(`/transactions/${tx.id}`))).send(expense({ memo: '메모만 수정' }));
    expect(res.body).toMatchObject({ memo: '메모만 수정', importance: 'B' });
    expect(res.body.tags.map((t: TagDto) => t.name)).toEqual(['유지']);
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });

  it('지출을 수입으로 바꾸면 중요도와 태그를 지우고 잔액은 정확히 옮겨 간다', async () => {
    const before = await balance();
    const tx = await createTx({ amount: 5000, importance: 'A', tags: ['전환'] });
    expect(await balance()).toBe(before - 5000);
    const res = await as('a', api().put(path(`/transactions/${tx.id}`))).send(expense({ amount: 5000, type: 'INCOME', categoryId: salary.id }));
    expect(res.body).toMatchObject({ type: 'INCOME', importance: null, tags: [] });
    expect(await balance()).toBe(before + 5000);
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
    expect(await balance()).toBe(before);
  });

  it('태그는 가계부마다 따로 있고 다른 가계부에서 보이지 않는다', async () => {
    const tx = await createTx({ tags: ['비밀'] });
    const [secret] = await tags();

    const other: BookDto = (await as('b', api().get('/api/v1/books'))).body[0];
    expect((await as('b', api().get(path('/tags')))).status).toBe(404);
    expect((await as('b', api().get(path('/tags', other.id)))).body).toEqual([]);
    const page = (await as('b', api().get(path('/transactions', other.id)).query({ tagId: secret.id }))).body;
    expect(page.items).toEqual([]);

    const mine = (await as('a', api().post('/api/v1/books')).send({ name: '다른 가계부' })).body as BookDto;
    const acc: AccountDto = (await as('a', api().get(path('/accounts', mine.id)))).body[0];
    const cats: CategoryDto[] = (await as('a', api().get(path('/categories', mine.id)))).body;
    const same = await as('a', api().post(path('/transactions', mine.id))).send(
      expense({ accountId: acc.id, categoryId: cats.find((c) => c.name === '식비')!.id, tags: ['비밀'] }),
    );
    expect(same.status).toBe(201);
    expect(same.body.tags[0].id).not.toBe(secret.id);
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });

  it('CSV 에 중요도와 태그가 들어간다', async () => {
    const tx = await createTx({ importance: 'B', tags: ['내보내기', '확인'] });
    const res = await as('a', api().get(path('/export/csv')).query({ from: '2026-11-01T00:00:00.000Z', to: '2026-12-01T00:00:00.000Z' }));
    const [header, line] = res.text.replace('﻿', '').split('\r\n');
    expect(header.endsWith('중요도,태그,세부카테고리')).toBe(true);
    expect(line.endsWith(',B,내보내기 확인,')).toBe(true);
    await as('a', api().delete(path(`/transactions/${tx.id}`)));
  });
});
