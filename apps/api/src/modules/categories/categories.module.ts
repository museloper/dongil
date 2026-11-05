import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CategoryType } from '@prisma/client';
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
    const parent = input.parentId ? await this.findParent(bookId, input.parentId, input.type) : null;
    const last = await this.prisma.category.aggregate({ where: { bookId, type: input.type }, _max: { sortOrder: true } });
    const row = await this.prisma.category.create({
      data: {
        ...input,
        parentId: parent?.id ?? null,
        ...(parent && { icon: parent.icon, color: parent.color }),
        bookId,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    return toCategoryDto(row);
  }

  async update(bookId: string, id: string, input: z.infer<typeof CategoryUpdateSchema>) {
    const current = await this.assertOwned(bookId, id);
    const parentId = input.parentId === undefined ? current.parentId : input.parentId;
    const parent = parentId ? await this.findParent(bookId, parentId, current.type, id) : null;
    const moving = !!parent && parent.id !== current.parentId;
    if (moving) {
      const children = await this.prisma.category.count({ where: { parentId: id, archived: false } });
      if (children) throw new BadRequestException('세부 카테고리가 있는 카테고리는 다른 카테고리 아래로 옮길 수 없습니다');
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.category.update({
        where: { id },
        data: { ...input, parentId, ...(parent && { icon: parent.icon, color: parent.color }) },
      });
      // 세부 카테고리는 상위의 아이콘과 색을 따른다. 숨긴 것도 과거 내역에 표시되므로 함께 바꾼다
      if (moving) {
        // 2단계를 넘지 않도록 숨겨 둔 세부 카테고리는 새 상위로 함께 옮긴다
        await tx.category.updateMany({ where: { parentId: id }, data: { parentId: parent.id, icon: parent.icon, color: parent.color } });
      } else if (!parent) {
        await tx.category.updateMany({ where: { parentId: id }, data: { icon: row.icon, color: row.color } });
      }
      return toCategoryDto(row);
    });
  }

  /** 상위를 숨기면 세부 카테고리도 함께 숨긴다 */
  async archive(bookId: string, id: string) {
    await this.assertOwned(bookId, id);
    await this.prisma.category.updateMany({ where: { bookId, OR: [{ id }, { parentId: id }] }, data: { archived: true } });
  }

  private async assertOwned(bookId: string, id: string) {
    const found = await this.prisma.category.findFirst({ where: { id, bookId, archived: false } });
    if (!found) throw new NotFoundException('카테고리를 찾을 수 없습니다');
    return found;
  }

  /** 상위가 될 수 있는 카테고리인지 확인한다: 같은 가계부·같은 종류의 최상위 카테고리 */
  private async findParent(bookId: string, parentId: string, type: CategoryType, selfId?: string) {
    const parent = await this.prisma.category.findFirst({ where: { id: parentId, bookId, archived: false } });
    if (!parent || parent.id === selfId) throw new BadRequestException('상위 카테고리를 찾을 수 없습니다');
    if (parent.type !== type) throw new BadRequestException('상위 카테고리와 종류가 같아야 합니다');
    if (parent.parentId) throw new BadRequestException('세부 카테고리 아래에는 둘 수 없습니다');
    return parent;
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
