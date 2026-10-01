import { Controller, Get, Header, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExportQuerySchema, toLocalDateKey } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { txInclude } from '../../common/mappers';

const TYPE_LABEL = { INCOME: '수입', EXPENSE: '지출', TRANSFER: '이체' } as const;

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@ApiTags('export')
@ApiBearerAuth()
@Controller('books/:bookId/export')
@UseGuards(BookAccessGuard)
export class ExportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="dongil.csv"')
  async csv(@BookId() bookId: string, @Query(new ZodPipe(ExportQuerySchema)) q: z.infer<typeof ExportQuerySchema>) {
    const rows = await this.prisma.transaction.findMany({
      where: { bookId, occurredAt: { gte: new Date(q.from), lt: new Date(q.to) } },
      include: txInclude,
      orderBy: { occurredAt: 'asc' },
    });
    const header = ['날짜', '구분', '카테고리', '금액', '계좌', '받는계좌', '메모', '작성자'];
    const lines = rows.map((t) =>
      [
        toLocalDateKey(t.occurredAt),
        TYPE_LABEL[t.type],
        t.category?.name,
        Number(t.amount),
        t.account.name,
        t.toAccount?.name,
        t.memo,
        t.createdBy.nickname,
      ]
        .map(csvCell)
        .join(','),
    );
    // BOM: 엑셀에서 한글이 깨지지 않도록
    return '﻿' + [header.join(','), ...lines].join('\r\n');
  }
}

@Module({ controllers: [ExportController] })
export class ExportModule {}
