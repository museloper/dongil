import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  monthRange,
  shiftMonth,
  type CalendarDayDto,
  type CategoryStatDto,
  type SummaryDto,
  type TrendPointDto,
} from '@dongil/shared';
import { PrismaService } from '../../common/prisma.module';

/** DB 는 UTC 로 저장하므로 KST 로 변환해 월/일 단위로 묶는다 */
const KST = Prisma.sql`("occurredAt" + interval '9 hours')`;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async totals(bookId: string, start: Date, end: Date) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { bookId, type: { in: ['INCOME', 'EXPENSE'] }, occurredAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    const get = (t: string) => Number(rows.find((r) => r.type === t)?._sum.amount ?? 0n);
    return { income: get('INCOME'), expense: get('EXPENSE') };
  }

  async summary(bookId: string, month: string): Promise<SummaryDto> {
    const cur = monthRange(month);
    const prev = monthRange(shiftMonth(month, -1));
    const [now, before] = await Promise.all([
      this.totals(bookId, cur.start, cur.end),
      this.totals(bookId, prev.start, prev.end),
    ]);
    return {
      month,
      income: now.income,
      expense: now.expense,
      net: now.income - now.expense,
      prevExpense: before.expense,
      expenseChangeRate: before.expense > 0 ? (now.expense - before.expense) / before.expense : null,
    };
  }

  /** 카테고리별 지출 합계 (month 범위). 예산 계산에서도 재사용 */
  async expenseByCategory(bookId: string, start: Date, end: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { bookId, type: 'EXPENSE', occurredAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    return new Map(rows.filter((r) => r.categoryId).map((r) => [r.categoryId!, Number(r._sum.amount ?? 0n)]));
  }

  async byCategory(bookId: string, month: string): Promise<CategoryStatDto[]> {
    const { start, end } = monthRange(month);
    const sums = await this.expenseByCategory(bookId, start, end);
    if (sums.size === 0) return [];
    const cats = await this.prisma.category.findMany({ where: { id: { in: [...sums.keys()] } } });
    const total = [...sums.values()].reduce((a, b) => a + b, 0);
    return cats
      .map((c) => {
        const amount = sums.get(c.id) ?? 0;
        return { categoryId: c.id, name: c.name, icon: c.icon, color: c.color, amount, ratio: total ? amount / total : 0 };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  /** month 를 끝으로 하는 최근 N개월 수입/지출 추이 (빈 달은 0으로 채움) */
  async trend(bookId: string, month: string, months: number): Promise<TrendPointDto[]> {
    const firstMonth = shiftMonth(month, -(months - 1));
    const start = monthRange(firstMonth).start;
    const end = monthRange(month).end;
    const rows = await this.prisma.$queryRaw<{ m: string; type: string; total: bigint }[]>`
      SELECT to_char(${KST}, 'YYYY-MM') AS m, type::text AS type, SUM(amount)::bigint AS total
      FROM "Transaction"
      WHERE "bookId" = ${bookId} AND type IN ('INCOME', 'EXPENSE')
        AND "occurredAt" >= ${start} AND "occurredAt" < ${end}
      GROUP BY 1, 2`;

    return Array.from({ length: months }, (_, i) => {
      const m = shiftMonth(firstMonth, i);
      const pick = (t: string) => Number(rows.find((r) => r.m === m && r.type === t)?.total ?? 0n);
      return { month: m, income: pick('INCOME'), expense: pick('EXPENSE') };
    });
  }

  async calendar(bookId: string, month: string): Promise<CalendarDayDto[]> {
    const { start, end } = monthRange(month);
    const rows = await this.prisma.$queryRaw<{ d: string; income: bigint; expense: bigint }[]>`
      SELECT to_char(${KST}, 'YYYY-MM-DD') AS d,
             COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::bigint  AS income,
             COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::bigint AS expense
      FROM "Transaction"
      WHERE "bookId" = ${bookId} AND "occurredAt" >= ${start} AND "occurredAt" < ${end}
      GROUP BY 1
      ORDER BY 1`;
    return rows.map((r) => ({ date: r.d, income: Number(r.income), expense: Number(r.expense) }));
  }
}
