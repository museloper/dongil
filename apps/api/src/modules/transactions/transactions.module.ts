import { Body, Controller, Delete, Get, HttpCode, Module, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  TransactionCreateSchema,
  TransactionQuerySchema,
  TransactionUpdateSchema,
  type TransactionCreate,
  type TransactionQuery,
} from '@dongil/shared';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  @Get()
  list(@UserId() userId: string, @Query(new ZodPipe(TransactionQuerySchema)) q: TransactionQuery) {
    return this.svc.list(userId, q);
  }

  @Get(':id')
  get(@UserId() userId: string, @Param('id') id: string) {
    return this.svc.get(userId, id);
  }

  @Post()
  create(@UserId() userId: string, @Body(new ZodPipe(TransactionCreateSchema)) body: TransactionCreate) {
    return this.svc.create(userId, body);
  }

  @Put(':id')
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(TransactionUpdateSchema)) body: TransactionCreate,
  ) {
    return this.svc.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.svc.remove(userId, id);
  }
}

@Module({ controllers: [TransactionsController], providers: [TransactionsService] })
export class TransactionsModule {}
