import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { TagDto } from '@dongil/shared';
import { PrismaService } from '../../common/prisma.module';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 쓰는 지출이 있는 태그만, 많이 쓴 순서로 */
  async list(bookId: string): Promise<TagDto[]> {
    const rows = await this.prisma.tag.findMany({
      where: { bookId, transactions: { some: {} } },
      include: { transactions: { select: { amount: true } } },
    });
    return rows
      .map((t) => ({
        id: t.id,
        name: t.name,
        count: t.transactions.length,
        total: Number(t.transactions.reduce((sum, tx) => sum + tx.amount, 0n)),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
  }
}

@ApiTags('tags')
@ApiBearerAuth()
@Controller('books/:bookId/tags')
@UseGuards(BookAccessGuard)
export class TagsController {
  constructor(private readonly svc: TagsService) {}

  @Get()
  list(@BookId() bookId: string) {
    return this.svc.list(bookId);
  }
}

@Module({ controllers: [TagsController], providers: [TagsService] })
export class TagsModule {}
