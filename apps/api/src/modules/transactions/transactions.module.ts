import { Body, Controller, Delete, Get, HttpCode, Module, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  TransactionCreateSchema,
  TransactionQuerySchema,
  TransactionUpdateSchema,
  type TransactionCreate,
  type TransactionQuery,
} from '@dongil/shared';
import { UserId } from '../../common/auth.guard';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('books/:bookId/transactions')
@UseGuards(BookAccessGuard)
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  @Get()
  list(@BookId() bookId: string, @Query(new ZodPipe(TransactionQuerySchema)) q: TransactionQuery) {
    return this.svc.list(bookId, q);
  }

  @Get(':id')
  get(@BookId() bookId: string, @Param('id') id: string) {
    return this.svc.get(bookId, id);
  }

  @Post()
  create(
    @BookId() bookId: string,
    @UserId() userId: string,
    @Body(new ZodPipe(TransactionCreateSchema)) body: TransactionCreate,
  ) {
    return this.svc.create(bookId, userId, body);
  }

  @Put(':id')
  update(
    @BookId() bookId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(TransactionUpdateSchema)) body: TransactionCreate,
  ) {
    return this.svc.update(bookId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@BookId() bookId: string, @Param('id') id: string) {
    return this.svc.remove(bookId, id);
  }
}

@Module({ controllers: [TransactionsController], providers: [TransactionsService] })
export class TransactionsModule {}
