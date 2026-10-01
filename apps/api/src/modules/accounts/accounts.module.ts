import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountCreateSchema, AccountUpdateSchema } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { toAccountDto } from '../../common/mappers';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.account.findMany({ where: { userId, archived: false }, orderBy: { createdAt: 'asc' } });
    return rows.map(toAccountDto);
  }

  async create(userId: string, input: z.infer<typeof AccountCreateSchema>) {
    const { initialBalance, ...rest } = input;
    const row = await this.prisma.account.create({ data: { ...rest, userId, balance: BigInt(initialBalance) } });
    return toAccountDto(row);
  }

  async update(userId: string, id: string, input: z.infer<typeof AccountUpdateSchema>) {
    await this.assertOwned(userId, id);
    return toAccountDto(await this.prisma.account.update({ where: { id }, data: input }));
  }

  /** 거래 내역이 연결돼 있을 수 있으므로 삭제 대신 보관 처리 */
  async archive(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.account.update({ where: { id }, data: { archived: true } });
  }

  private async assertOwned(userId: string, id: string) {
    const found = await this.prisma.account.findFirst({ where: { id, userId, archived: false } });
    if (!found) throw new NotFoundException('계좌를 찾을 수 없습니다');
  }
}

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly svc: AccountsService) {}

  @Get()
  list(@UserId() userId: string) {
    return this.svc.list(userId);
  }

  @Post()
  create(@UserId() userId: string, @Body(new ZodPipe(AccountCreateSchema)) body: z.infer<typeof AccountCreateSchema>) {
    return this.svc.create(userId, body);
  }

  @Patch(':id')
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(AccountUpdateSchema)) body: z.infer<typeof AccountUpdateSchema>,
  ) {
    return this.svc.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.svc.archive(userId, id);
  }
}

@Module({ controllers: [AccountsController], providers: [AccountsService] })
export class AccountsModule {}
