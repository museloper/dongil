import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountCreateSchema, AccountUpdateSchema } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { toAccountDto } from '../../common/mappers';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(bookId: string) {
    const rows = await this.prisma.account.findMany({ where: { bookId, archived: false }, orderBy: { createdAt: 'asc' } });
    return rows.map(toAccountDto);
  }

  async create(bookId: string, input: z.infer<typeof AccountCreateSchema>) {
    const { initialBalance, ...rest } = input;
    const row = await this.prisma.account.create({ data: { ...rest, bookId, balance: BigInt(initialBalance) } });
    return toAccountDto(row);
  }

  async update(bookId: string, id: string, input: z.infer<typeof AccountUpdateSchema>) {
    await this.assertOwned(bookId, id);
    return toAccountDto(await this.prisma.account.update({ where: { id }, data: input }));
  }

  /** 거래 내역이 연결돼 있을 수 있으므로 삭제 대신 보관 처리 */
  async archive(bookId: string, id: string) {
    await this.assertOwned(bookId, id);
    await this.prisma.account.update({ where: { id }, data: { archived: true } });
  }

  private async assertOwned(bookId: string, id: string) {
    const found = await this.prisma.account.findFirst({ where: { id, bookId, archived: false } });
    if (!found) throw new NotFoundException('계좌를 찾을 수 없습니다');
  }
}

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('books/:bookId/accounts')
@UseGuards(BookAccessGuard)
export class AccountsController {
  constructor(private readonly svc: AccountsService) {}

  @Get()
  list(@BookId() bookId: string) {
    return this.svc.list(bookId);
  }

  @Post()
  create(@BookId() bookId: string, @Body(new ZodPipe(AccountCreateSchema)) body: z.infer<typeof AccountCreateSchema>) {
    return this.svc.create(bookId, body);
  }

  @Patch(':id')
  update(
    @BookId() bookId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(AccountUpdateSchema)) body: z.infer<typeof AccountUpdateSchema>,
  ) {
    return this.svc.update(bookId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@BookId() bookId: string, @Param('id') id: string) {
    return this.svc.archive(bookId, id);
  }
}

@Module({ controllers: [AccountsController], providers: [AccountsService] })
export class AccountsModule {}
