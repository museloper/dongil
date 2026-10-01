import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Paginated, TransactionCreate, TransactionDto, TransactionQuery } from '@dongil/shared';
import { PrismaService } from '../../common/prisma.module';
import { toTransactionDto, txInclude } from '../../common/mappers';
import { balanceDeltas, mergeDeltas } from './balance';

type Tx = Prisma.TransactionClient;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: TransactionQuery): Promise<Paginated<TransactionDto>> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: q.type,
      categoryId: q.categoryId,
      occurredAt: { gte: q.from ? new Date(q.from) : undefined, lt: q.to ? new Date(q.to) : undefined },
      ...(q.accountId && { OR: [{ accountId: q.accountId }, { toAccountId: q.accountId }] }),
      ...(q.q && {
        AND: [
          {
            OR: [
              { memo: { contains: q.q, mode: 'insensitive' } },
              { category: { name: { contains: q.q, mode: 'insensitive' } } },
            ],
          },
        ],
      }),
    };

    const rows = await this.prisma.transaction.findMany({
      where,
      include: txInclude,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });

    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    return { items: items.map(toTransactionDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async get(userId: string, id: string): Promise<TransactionDto> {
    const row = await this.prisma.transaction.findFirst({ where: { id, userId }, include: txInclude });
    if (!row) throw new NotFoundException('거래를 찾을 수 없습니다');
    return toTransactionDto(row);
  }

  async create(userId: string, input: TransactionCreate): Promise<TransactionDto> {
    return this.prisma.$transaction(async (tx) => {
      const data = await this.normalize(tx, userId, input);
      const row = await tx.transaction.create({ data: { ...data, userId } });
      await this.applyDeltas(tx, balanceDeltas(data));
      return toTransactionDto(await this.reload(tx, row.id));
    });
  }

  async update(userId: string, id: string, input: TransactionCreate): Promise<TransactionDto> {
    return this.prisma.$transaction(async (tx) => {
      const prev = await tx.transaction.findFirst({ where: { id, userId } });
      if (!prev) throw new NotFoundException('거래를 찾을 수 없습니다');
      const data = await this.normalize(tx, userId, input);
      await tx.transaction.update({ where: { id }, data });
      await this.applyDeltas(tx, mergeDeltas(balanceDeltas(prev, -1), balanceDeltas(data)));
      return toTransactionDto(await this.reload(tx, id));
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const prev = await tx.transaction.findFirst({ where: { id, userId } });
      if (!prev) throw new NotFoundException('거래를 찾을 수 없습니다');
      await tx.transaction.delete({ where: { id } });
      await this.applyDeltas(tx, balanceDeltas(prev, -1));
    });
  }

  /** 입력값의 계좌/카테고리가 본인 소유인지, 거래 종류와 카테고리 종류가 맞는지 확인 */
  private async normalize(tx: Tx, userId: string, input: TransactionCreate) {
    const accountIds = [input.accountId, ...(input.type === 'TRANSFER' && input.toAccountId ? [input.toAccountId] : [])];
    const owned = await tx.account.count({ where: { userId, archived: false, id: { in: accountIds } } });
    if (owned !== accountIds.length) throw new BadRequestException('계좌를 찾을 수 없습니다');

    let categoryId: string | null = null;
    if (input.type !== 'TRANSFER') {
      const cat = await tx.category.findFirst({ where: { id: input.categoryId!, userId } });
      if (!cat) throw new BadRequestException('카테고리를 찾을 수 없습니다');
      if (cat.type !== input.type) throw new BadRequestException('거래 종류와 카테고리 종류가 맞지 않습니다');
      categoryId = cat.id;
    }

    return {
      type: input.type,
      amount: BigInt(input.amount),
      accountId: input.accountId,
      toAccountId: input.type === 'TRANSFER' ? input.toAccountId! : null,
      categoryId,
      memo: input.memo?.trim() || null,
      occurredAt: new Date(input.occurredAt),
    };
  }

  private async applyDeltas(tx: Tx, deltas: Map<string, bigint>) {
    for (const [accountId, delta] of deltas) {
      await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
    }
  }

  private reload(tx: Tx, id: string) {
    return tx.transaction.findUniqueOrThrow({ where: { id }, include: txInclude });
  }
}
