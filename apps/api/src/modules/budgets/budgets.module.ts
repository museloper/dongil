import { BadRequestException, Body, Controller, Get, Injectable, Module, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BudgetUpsertSchema, MonthQuerySchema, monthRange, type BudgetDto, type BudgetUpsert } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { StatsModule } from '../stats/stats.module';
import { StatsService } from '../stats/stats.service';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async get(userId: string, month: string): Promise<BudgetDto> {
    const { start, end } = monthRange(month);
    const [budgets, byCat, totals] = await Promise.all([
      this.prisma.budget.findMany({ where: { userId, month }, include: { category: true } }),
      this.stats.expenseByCategory(userId, start, end),
      this.stats.totals(userId, start, end),
    ]);

    const items = budgets
      .map((b) => {
        const amount = Number(b.amount);
        const spent = b.categoryId ? (byCat.get(b.categoryId) ?? 0) : totals.expense;
        return {
          categoryId: b.categoryId,
          categoryName: b.category?.name ?? null,
          icon: b.category?.icon ?? null,
          color: b.category?.color ?? null,
          amount,
          spent,
          ratio: amount > 0 ? spent / amount : 0,
        };
      })
      // 전체 예산을 맨 위로, 나머지는 사용률 높은 순
      .sort((a, b) => (a.categoryId === null ? -1 : b.categoryId === null ? 1 : b.ratio - a.ratio));

    return { month, items };
  }

  /** 해당 월 예산을 통째로 교체 */
  async upsert(userId: string, input: BudgetUpsert): Promise<BudgetDto> {
    const catIds = input.items.map((i) => i.categoryId).filter((v): v is string => !!v);
    if (new Set(input.items.map((i) => i.categoryId)).size !== input.items.length) {
      throw new BadRequestException('같은 카테고리 예산이 중복되었습니다');
    }
    const owned = await this.prisma.category.count({ where: { userId, type: 'EXPENSE', id: { in: catIds } } });
    if (owned !== catIds.length) throw new BadRequestException('지출 카테고리만 예산을 설정할 수 있습니다');

    await this.prisma.$transaction([
      this.prisma.budget.deleteMany({ where: { userId, month: input.month } }),
      this.prisma.budget.createMany({
        data: input.items.map((i) => ({ userId, month: input.month, categoryId: i.categoryId, amount: BigInt(i.amount) })),
      }),
    ]);
    return this.get(userId, input.month);
  }
}

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly svc: BudgetsService) {}

  @Get()
  get(@UserId() userId: string, @Query(new ZodPipe(MonthQuerySchema)) q: z.infer<typeof MonthQuerySchema>) {
    return this.svc.get(userId, q.month);
  }

  @Put()
  upsert(@UserId() userId: string, @Body(new ZodPipe(BudgetUpsertSchema)) body: BudgetUpsert) {
    return this.svc.upsert(userId, body);
  }
}

@Module({ imports: [StatsModule], controllers: [BudgetsController], providers: [BudgetsService] })
export class BudgetsModule {}
