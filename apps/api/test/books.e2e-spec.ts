import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AccountDto, AuthResponse, BookDto, CategoryDto, InviteDto, Paginated, TransactionDto } from '@dongil/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.module';
import { deleteUsers } from './cleanup';

describe('공유 가계부 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const emails = ['a', 'b', 'c'].map((n) => `book-${n}-${stamp}@test.local`);
  const users: Record<'a' | 'b' | 'c', AuthResponse> = {} as never;
  let shared: BookDto;

  const api = () => request(app.getHttpServer());
  const as = (who: 'a' | 'b' | 'c', req: request.Test) => req.set('Authorization', `Bearer ${users[who].accessToken}`);
  const bookPath = (bookId: string, path = '') => `/api/v1/books/${bookId}${path}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    for (const [i, who] of (['a', 'b', 'c'] as const).entries()) {
      const res = await api().post('/api/v1/auth/signup').send({ email: emails[i], password: 'password123', nickname: who.toUpperCase() });
      users[who] = res.body;
    }
  });

  afterAll(async () => {
    await deleteUsers(prisma, emails);
    await app.close();
  });

  it('가입하면 개인 가계부가 하나 생긴다', async () => {
    const books: BookDto[] = (await as('a', api().get('/api/v1/books'))).body;
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({ type: 'PERSONAL', role: 'OWNER', members: [{ nickname: 'A', role: 'OWNER' }] });
  });

  it('개인 가계부에는 초대 코드를 만들 수 없다', async () => {
    const personal: BookDto = (await as('a', api().get('/api/v1/books'))).body[0];
    expect((await as('a', api().post(bookPath(personal.id, '/invite')))).status).toBe(400);
  });

  it('A 가 공유 가계부를 만들면 기본 카테고리와 현금 계좌가 함께 생긴다', async () => {
    const res = await as('a', api().post('/api/v1/books')).send({ name: '우리집' });
    expect(res.status).toBe(201);
    shared = res.body;
    expect(shared).toMatchObject({ name: '우리집', type: 'SHARED', role: 'OWNER' });

    const cats: CategoryDto[] = (await as('a', api().get(bookPath(shared.id, '/categories')))).body;
    expect(cats.length).toBeGreaterThan(5);
    const accs: AccountDto[] = (await as('a', api().get(bookPath(shared.id, '/accounts')))).body;
    expect(accs.map((a) => a.name)).toEqual(['현금']);
  });

  it('비멤버는 공유 가계부에 접근할 수 없다 (404)', async () => {
    expect((await as('b', api().get(bookPath(shared.id, '/transactions')))).status).toBe(404);
    expect((await as('b', api().post(bookPath(shared.id, '/invite')))).status).toBe(404);
  });

  it('재발급하면 이전 코드는 무효, 만료된 코드도 거부된다', async () => {
    const first: InviteDto = (await as('a', api().post(bookPath(shared.id, '/invite')))).body;
    expect(first.code).toMatch(/^[A-Z2-9]{6}$/);
    const second: InviteDto = (await as('a', api().post(bookPath(shared.id, '/invite')))).body;
    expect((await as('b', api().post('/api/v1/books/join')).send({ code: first.code })).status).toBe(400);

    await prisma.bookInvite.update({ where: { code: second.code }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await as('b', api().post('/api/v1/books/join')).send({ code: second.code })).status).toBe(400);
  });

  it('B 가 초대 코드로 참여하고(소문자 입력 허용), 같은 코드는 다시 쓸 수 없다', async () => {
    const invite: InviteDto = (await as('a', api().post(bookPath(shared.id, '/invite')))).body;
    const res = await as('b', api().post('/api/v1/books/join')).send({ code: invite.code.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: shared.id, role: 'MEMBER' });
    expect((res.body as BookDto).members.map((m) => m.nickname)).toEqual(['A', 'B']);

    expect((await as('c', api().post('/api/v1/books/join')).send({ code: invite.code })).status).toBe(400);
  });

  it('정원(2명)이 차면 초대 코드를 만들 수 없다', async () => {
    expect((await as('a', api().post(bookPath(shared.id, '/invite')))).status).toBe(409);
  });

  it('정원이 찼는데 남은 코드로 참여하면 409', async () => {
    // 정원 확인을 우회한 코드를 직접 만들어 C 가 참여 시도
    await prisma.bookInvite.create({
      data: { bookId: shared.id, code: 'ZZZZZ9', createdById: users.a.user.id, expiresAt: new Date(Date.now() + 60_000) },
    });
    expect((await as('c', api().post('/api/v1/books/join')).send({ code: 'ZZZZZ9' })).status).toBe(409);
  });

  it('A 가 입력한 거래가 B 의 목록/통계/잔액에 보이고 작성자는 A 다', async () => {
    const cats: CategoryDto[] = (await as('b', api().get(bookPath(shared.id, '/categories')))).body;
    const food = cats.find((c) => c.name === '식비')!;
    const cash: AccountDto = (await as('b', api().get(bookPath(shared.id, '/accounts')))).body[0];

    const created = await as('a', api().post(bookPath(shared.id, '/transactions'))).send({
      type: 'EXPENSE', amount: 30000, accountId: cash.id, categoryId: food.id, memo: '장보기', occurredAt: '2026-10-01T18:00:00+09:00',
    });
    expect(created.status).toBe(201);
    expect(created.body.author).toEqual({ id: users.a.user.id, nickname: 'A' });

    const list: Paginated<TransactionDto> = (await as('b', api().get(bookPath(shared.id, '/transactions')))).body;
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ memo: '장보기', author: { nickname: 'A' } });

    const summary = (await as('b', api().get(bookPath(shared.id, '/stats/summary?month=2026-10')))).body;
    expect(summary.expense).toBe(30000);
    const accs: AccountDto[] = (await as('b', api().get(bookPath(shared.id, '/accounts')))).body;
    expect(accs[0].balance).toBe(-30000);

    // B 가 수정해도 작성자는 A 로 유지
    const upd = await as('b', api().put(bookPath(shared.id, `/transactions/${created.body.id}`))).send({
      type: 'EXPENSE', amount: 32000, accountId: cash.id, categoryId: food.id, memo: '장보기', occurredAt: '2026-10-01T18:00:00+09:00',
    });
    expect(upd.body.author.nickname).toBe('A');

    // 공유 가계부 거래는 각자의 개인 가계부와 섞이지 않는다
    const aPersonal: BookDto = (await as('a', api().get('/api/v1/books'))).body[0];
    const personalList = (await as('a', api().get(bookPath(aPersonal.id, '/transactions')))).body;
    expect(personalList.items).toHaveLength(0);

    const csv = await as('b', api().get(bookPath(shared.id, '/export/csv'))).query({
      from: '2026-10-01T00:00:00+09:00', to: '2026-11-01T00:00:00+09:00',
    });
    expect(csv.text.replace('﻿', '').split('\r\n')[1]).toContain(',A');
  });

  it('B 의 목록에 개인 + 공유 가계부가 보이고 이름 변경은 멤버 누구나 가능하다', async () => {
    const books: BookDto[] = (await as('b', api().get('/api/v1/books'))).body;
    expect(books.map((b) => b.type)).toEqual(['PERSONAL', 'SHARED']);
    const res = await as('b', api().patch(bookPath(shared.id))).send({ name: '우리집 생활비' });
    expect(res.body.name).toBe('우리집 생활비');
  });

  it('MEMBER 는 삭제/내보내기 불가, OWNER 는 나갈 수 없다', async () => {
    expect((await as('b', api().delete(bookPath(shared.id)))).status).toBe(403);
    expect((await as('b', api().delete(bookPath(shared.id, `/members/${users.a.user.id}`)))).status).toBe(403);
    expect((await as('a', api().delete(bookPath(shared.id, `/members/${users.a.user.id}`)))).status).toBe(400);
  });

  it('B 가 나가면 더 이상 접근할 수 없다', async () => {
    expect((await as('b', api().delete(bookPath(shared.id, `/members/${users.b.user.id}`)))).status).toBe(204);
    expect((await as('b', api().get(bookPath(shared.id, '/transactions')))).status).toBe(404);
    const books: BookDto[] = (await as('b', api().get('/api/v1/books'))).body;
    expect(books.map((b) => b.type)).toEqual(['PERSONAL']);
  });

  it('OWNER 가 삭제하면 가계부 데이터가 모두 지워진다', async () => {
    expect((await as('a', api().delete(bookPath(shared.id)))).status).toBe(204);
    expect(await prisma.transaction.count({ where: { bookId: shared.id } })).toBe(0);
    expect(await prisma.account.count({ where: { bookId: shared.id } })).toBe(0);
    expect((await as('a', api().get(bookPath(shared.id, '/accounts')))).status).toBe(404);
  });

  it('개인 가계부는 삭제할 수 없다', async () => {
    const personal: BookDto = (await as('a', api().get('/api/v1/books'))).body[0];
    expect((await as('a', api().delete(bookPath(personal.id)))).status).toBe(400);
  });
});
