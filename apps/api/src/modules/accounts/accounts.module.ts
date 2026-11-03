import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountCreateSchema, AccountUpdateSchema, DefaultAccountSchema, type DefaultAccountInput } from '@dongil/shared';
import { z } from 'zod';
import { UserId } from '../../common/auth.guard';
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
    await this.prisma.$transaction([
      this.prisma.account.update({ where: { id }, data: { archived: true } }),
      // 숨긴 계좌가 입력 화면에 먼저 선택되면 안 되므로 지정도 함께 푼다
      this.prisma.bookMember.updateMany({ where: { bookId, defaultAccountId: id }, data: { defaultAccountId: null } }),
    ]);
  }

  /** 내가 주로 쓰는 자산 지정/해제. 멤버마다 따로 저장한다 */
  async setDefault(bookId: string, userId: string, accountId: string | null) {
    if (accountId) {
      const found = await this.prisma.account.findFirst({ where: { id: accountId, bookId, archived: false } });
      if (!found) throw new BadRequestException('이 가계부의 계좌가 아닙니다');
    }
    await this.prisma.bookMember.update({ where: { bookId_userId: { bookId, userId } }, data: { defaultAccountId: accountId } });
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

  @Put('default')
  @HttpCode(204)
  setDefault(@BookId() bookId: string, @UserId() userId: string, @Body(new ZodPipe(DefaultAccountSchema)) body: DefaultAccountInput) {
    return this.svc.setDefault(bookId, userId, body.accountId);
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
