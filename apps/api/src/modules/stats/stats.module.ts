import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MonthQuerySchema, TrendQuerySchema } from '@dongil/shared';
import { z } from 'zod';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { StatsService } from './stats.service';

type MonthQ = z.infer<typeof MonthQuerySchema>;

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get('summary')
  summary(@UserId() userId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.summary(userId, q.month);
  }

  @Get('by-category')
  byCategory(@UserId() userId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.byCategory(userId, q.month);
  }

  @Get('trend')
  trend(@UserId() userId: string, @Query(new ZodPipe(TrendQuerySchema)) q: z.infer<typeof TrendQuerySchema>) {
    return this.svc.trend(userId, q.month, q.months);
  }

  @Get('calendar')
  calendar(@UserId() userId: string, @Query(new ZodPipe(MonthQuerySchema)) q: MonthQ) {
    return this.svc.calendar(userId, q.month);
  }
}

@Module({ controllers: [StatsController], providers: [StatsService], exports: [StatsService] })
export class StatsModule {}
