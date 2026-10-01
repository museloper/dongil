import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AccountDto, AuthResponse, CategoryDto } from '@dongil/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.module';

describe('Dongil API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthResponse;
  let cash: AccountDto;
  let bank: AccountDto;
  let food: CategoryDto;
  let salary: CategoryDto;
  const email = `e2e-${Date.now()}@test.local`;

  const api = () => request(app.getHttpServer());
  const authed = (req: request.Test) => req.set('Authorization', `Bearer ${auth.accessToken}`);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('회원가입 시 토큰, 기본 카테고리, 현금 계좌가 생성된다', async () => {
    const res = await api().post('/api/v1/auth/signup').send({ email, password: 'password123', nickname: '돈길' });
    expect(res.status).toBe(201);
    auth = res.body;
    expect(auth.accessToken).toBeTruthy();

    const cats = await authed(api().get('/api/v1/categories'));
    expect(cats.body.length).toBeGreaterThan(5);
    food = cats.body.find((c: CategoryDto) => c.name === '식비');
    salary = cats.body.find((c: CategoryDto) => c.name === '월급');

    const accs = await authed(api().get('/api/v1/accounts'));
    cash = accs.body[0];
    expect(cash.name).toBe('현금');
  });

  it('중복 가입과 잘못된 비밀번호를 거부한다', async () => {
    const dup = await api().post('/api/v1/auth/signup').send({ email, password: 'password123', nickname: 'x' });
    expect(dup.status).toBe(409);
    const bad = await api().post('/api/v1/auth/login').send({ email, password: 'wrong-pass' });
    expect(bad.status).toBe(401);
  });

  it('토큰 없이 접근하면 401', async () => {
    expect((await api().get('/api/v1/accounts')).status).toBe(401);
  });

  it('refresh 토큰은 회전되며 재사용할 수 없다', async () => {
    const r1 = await api().post('/api/v1/auth/refresh').send({ refreshToken: auth.refreshToken });
    expect(r1.status).toBe(200);
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: auth.refreshToken });
    expect(reuse.status).toBe(401);
    auth = r1.body;
  });

  it('거래 생성/수정/삭제에 따라 계좌 잔액이 정확히 맞는다', async () => {
    bank = (await authed(api().post('/api/v1/accounts')).send({ name: '월급통장', type: 'BANK', initialBalance: 100000 })).body;

    const income = await authed(api().post('/api/v1/transactions')).send({
      type: 'INCOME', amount: 3000000, accountId: bank.id, categoryId: salary.id, occurredAt: '2026-09-25T09:00:00+09:00',
    });
    expect(income.status).toBe(201);

    const lunch = await authed(api().post('/api/v1/transactions')).send({
      type: 'EXPENSE', amount: 12000, accountId: bank.id, categoryId: food.id, memo: '점심 김치찌개', occurredAt: '2026-09-26T12:30:00+09:00',
    });
    expect(lunch.status).toBe(201);

    const transfer = await authed(api().post('/api/v1/transactions')).send({
      type: 'TRANSFER', amount: 50000, accountId: bank.id, toAccountId: cash.id, occurredAt: '2026-09-27T10:00:00+09:00',
    });
    expect(transfer.status).toBe(201);

    let accs: AccountDto[] = (await authed(api().get('/api/v1/accounts'))).body;
    expect(accs.find((a) => a.id === bank.id)!.balance).toBe(100000 + 3000000 - 12000 - 50000);
    expect(accs.find((a) => a.id === cash.id)!.balance).toBe(50000);

    // 점심값 수정 12,000 -> 15,000 & 현금 결제로 변경
    const upd = await authed(api().put(`/api/v1/transactions/${lunch.body.id}`)).send({
      type: 'EXPENSE', amount: 15000, accountId: cash.id, categoryId: food.id, memo: '점심 김치찌개', occurredAt: '2026-09-26T12:30:00+09:00',
    });
    expect(upd.status).toBe(200);
    accs = (await authed(api().get('/api/v1/accounts'))).body;
    expect(accs.find((a) => a.id === bank.id)!.balance).toBe(100000 + 3000000 - 50000);
    expect(accs.find((a) => a.id === cash.id)!.balance).toBe(50000 - 15000);

    // 이체 삭제 → 원복
    expect((await authed(api().delete(`/api/v1/transactions/${transfer.body.id}`))).status).toBe(204);
    accs = (await authed(api().get('/api/v1/accounts'))).body;
    expect(accs.find((a) => a.id === bank.id)!.balance).toBe(100000 + 3000000);
    expect(accs.find((a) => a.id === cash.id)!.balance).toBe(-15000);
  });

  it('검증 실패: 카테고리 종류 불일치, 같은 계좌 이체', async () => {
    const wrongCat = await authed(api().post('/api/v1/transactions')).send({
      type: 'EXPENSE', amount: 1000, accountId: cash.id, categoryId: salary.id, occurredAt: '2026-09-26T12:00:00+09:00',
    });
    expect(wrongCat.status).toBe(400);
    const selfTransfer = await authed(api().post('/api/v1/transactions')).send({
      type: 'TRANSFER', amount: 1000, accountId: cash.id, toAccountId: cash.id, occurredAt: '2026-09-26T12:00:00+09:00',
    });
    expect(selfTransfer.status).toBe(400);
  });

  it('KST 월 경계: 10/1 00:30 KST 거래는 10월로 집계된다', async () => {
    await authed(api().post('/api/v1/transactions')).send({
      type: 'EXPENSE', amount: 7000, accountId: cash.id, categoryId: food.id, occurredAt: '2026-10-01T00:30:00+09:00',
    });
    const sep = (await authed(api().get('/api/v1/stats/summary?month=2026-09'))).body;
    expect(sep.income).toBe(3000000);
    expect(sep.expense).toBe(15000);
    const oct = (await authed(api().get('/api/v1/stats/summary?month=2026-10'))).body;
    expect(oct.expense).toBe(7000);
  });

  it('통계: 카테고리별, 추이, 캘린더', async () => {
    const byCat = (await authed(api().get('/api/v1/stats/by-category?month=2026-09'))).body;
    expect(byCat).toEqual([expect.objectContaining({ name: '식비', amount: 15000, ratio: 1 })]);

    const trend = (await authed(api().get('/api/v1/stats/trend?month=2026-10&months=3'))).body;
    expect(trend.map((t: { month: string }) => t.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(trend[1]).toEqual({ month: '2026-09', income: 3000000, expense: 15000 });

    const cal = (await authed(api().get('/api/v1/stats/calendar?month=2026-09'))).body;
    expect(cal).toEqual([
      { date: '2026-09-25', income: 3000000, expense: 0 },
      { date: '2026-09-26', income: 0, expense: 15000 },
    ]);
  });

  it('예산: 전체/카테고리 예산과 사용액', async () => {
    const res = await authed(api().put('/api/v1/budgets')).send({
      month: '2026-09',
      items: [{ categoryId: null, amount: 1000000 }, { categoryId: food.id, amount: 20000 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ categoryId: null, amount: 1000000, spent: 15000 });
    expect(res.body.items[1]).toMatchObject({ categoryName: '식비', amount: 20000, spent: 15000, ratio: 0.75 });
  });

  it('내역: 검색, 페이지네이션', async () => {
    const search = (await authed(api().get('/api/v1/transactions?q=김치'))).body;
    expect(search.items).toHaveLength(1);

    const p1 = (await authed(api().get('/api/v1/transactions?limit=2'))).body;
    expect(p1.items).toHaveLength(2);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = (await authed(api().get(`/api/v1/transactions?limit=2&cursor=${p1.nextCursor}`))).body;
    expect(p2.items).toHaveLength(1);
    expect(p2.nextCursor).toBeNull();
  });

  it('CSV 내보내기', async () => {
    const res = await authed(
      api().get('/api/v1/export/csv').query({ from: '2026-09-01T00:00:00+09:00', to: '2026-10-01T00:00:00+09:00' }),
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('날짜,구분,카테고리,금액,계좌,받는계좌,메모');
    expect(lines).toHaveLength(3);
  });

  it('다른 사용자의 데이터에는 접근할 수 없다', async () => {
    const other = (
      await api().post('/api/v1/auth/signup').send({ email: `other-${email}`, password: 'password123', nickname: '남' })
    ).body as AuthResponse;
    const res = await api()
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ type: 'EXPENSE', amount: 1, accountId: cash.id, categoryId: food.id, occurredAt: '2026-09-26T12:00:00+09:00' });
    expect(res.status).toBe(400);
    await prisma.user.deleteMany({ where: { email: `other-${email}` } });
  });
});
