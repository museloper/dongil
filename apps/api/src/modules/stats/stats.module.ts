import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MonthQuerySchema, TrendQuerySchema } from '@dongil/shared';
import { z } from 'zod';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { StatsService } from './stats.service';

type MonthQ = z.infer<typeof MonthQuerySchema>;

@ApiTags('stats')
@ApiBearerAuth()
@Controller('books/:bookId/stats')
@UseGuards(BookAccessGuard)
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get('summary')
  summary(@BookId() bookId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.summary(bookId, q.month);
  }

  @Get('by-category')
  byCategory(@BookId() bookId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.byCategory(bookId, q.month);
  }

  @Get('trend')
  trend(@BookId() bookId: string, @Query(new ZodPipe(TrendQuerySchema)) q: z.infer<typeof TrendQuerySchema>) {
    return this.svc.trend(bookId, q.month, q.months);
  }

  @Get('calendar')
  calendar(@BookId() bookId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.calendar(bookId, q.month);
  }
}

@Module({ controllers: [StatsController], providers: [StatsService], exports: [StatsService] })
export class StatsModule {}
