import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryCreateSchema, CategoryUpdateSchema } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { toCategoryDto } from '../../common/mappers';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(bookId: string) {
    const rows = await this.prisma.category.findMany({
      where: { bookId, archived: false },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
    return rows.map(toCategoryDto);
  }

  async create(bookId: string, input: z.infer<typeof CategoryCreateSchema>) {
    const last = await this.prisma.category.aggregate({ where: { bookId, type: input.type }, _max: { sortOrder: true } });
    const row = await this.prisma.category.create({
      data: { ...input, bookId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    return toCategoryDto(row);
  }

  async update(bookId: string, id: string, input: z.infer<typeof CategoryUpdateSchema>) {
    await this.assertOwned(bookId, id);
    return toCategoryDto(await this.prisma.category.update({ where: { id }, data: input }));
  }

  async archive(bookId: string, id: string) {
    await this.assertOwned(bookId, id);
    await this.prisma.category.update({ where: { id }, data: { archived: true } });
  }

  private async assertOwned(bookId: string, id: string) {
    const found = await this.prisma.category.findFirst({ where: { id, bookId, archived: false } });
    if (!found) throw new NotFoundException('카테고리를 찾을 수 없습니다');
  }
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('books/:bookId/categories')
@UseGuards(BookAccessGuard)
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(@BookId() bookId: string) {
    return this.svc.list(bookId);
  }

  @Post()
  create(@BookId() bookId: string, @Body(new ZodPipe(CategoryCreateSchema)) body: z.infer<typeof CategoryCreateSchema>) {
    return this.svc.create(bookId, body);
  }

  @Patch(':id')
  update(
    @BookId() bookId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(CategoryUpdateSchema)) body: z.infer<typeof CategoryUpdateSchema>,
  ) {
    return this.svc.update(bookId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@BookId() bookId: string, @Param('id') id: string) {
    return this.svc.archive(bookId, id);
  }
}

@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
