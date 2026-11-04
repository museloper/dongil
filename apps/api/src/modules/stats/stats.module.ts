import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatsBreakdownQuerySchema, StatsQuerySchema, StatsTrendQuerySchema, type StatsBreakdownQuery } from '@dongil/shared';
import { z } from 'zod';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { StatsService } from './stats.service';

type StatsQ = z.infer<typeof StatsQuerySchema>;

@ApiTags('stats')
@ApiBearerAuth()
@Controller('books/:bookId/stats')
@UseGuards(BookAccessGuard)
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get('summary')
  summary(@BookId() bookId: string, @Query(new ZodPipe(StatsQuerySchema)) q: StatsQ) {
    return this.svc.summary(bookId, q.month, q.accountId);
  }

  @Get('by-category')
  byCategory(@BookId() bookId: string, @Query(new ZodPipe(StatsBreakdownQuerySchema)) q: StatsBreakdownQuery) {
    return this.svc.byCategory(bookId, q);
  }

  @Get('by-importance')
  byImportance(@BookId() bookId: string, @Query(new ZodPipe(StatsBreakdownQuerySchema)) q: StatsBreakdownQuery) {
    return this.svc.byImportance(bookId, q);
  }

  @Get('by-tag')
  byTag(@BookId() bookId: string, @Query(new ZodPipe(StatsBreakdownQuerySchema)) q: StatsBreakdownQuery) {
    return this.svc.byTag(bookId, q);
  }

  @Get('trend')
  trend(@BookId() bookId: string, @Query(new ZodPipe(StatsTrendQuerySchema)) q: z.infer<typeof StatsTrendQuerySchema>) {
    return this.svc.trend(bookId, q.month, q.months, q.accountId);
  }

  @Get('calendar')
  calendar(@BookId() bookId: string, @Query(new ZodPipe(StatsQuerySchema)) q: StatsQ) {
    return this.svc.calendar(bookId, q.month, q.accountId);
  }
}

@Module({ controllers: [StatsController], providers: [StatsService], exports: [StatsService] })
export class StatsModule {}
