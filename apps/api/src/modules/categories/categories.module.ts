import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryCreateSchema, CategoryUpdateSchema } from '@dongil/shared';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.module';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { toCategoryDto } from '../../common/mappers';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.category.findMany({
      where: { userId, archived: false },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
    return rows.map(toCategoryDto);
  }

  async create(userId: string, input: z.infer<typeof CategoryCreateSchema>) {
    const last = await this.prisma.category.aggregate({ where: { userId, type: input.type }, _max: { sortOrder: true } });
    const row = await this.prisma.category.create({
      data: { ...input, userId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    return toCategoryDto(row);
  }

  async update(userId: string, id: string, input: z.infer<typeof CategoryUpdateSchema>) {
    await this.assertOwned(userId, id);
    return toCategoryDto(await this.prisma.category.update({ where: { id }, data: input }));
  }

  async archive(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.category.update({ where: { id }, data: { archived: true } });
  }

  private async assertOwned(userId: string, id: string) {
    const found = await this.prisma.category.findFirst({ where: { id, userId, archived: false } });
    if (!found) throw new NotFoundException('카테고리를 찾을 수 없습니다');
  }
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(@UserId() userId: string) {
    return this.svc.list(userId);
  }

  @Post()
  create(@UserId() userId: string, @Body(new ZodPipe(CategoryCreateSchema)) body: z.infer<typeof CategoryCreateSchema>) {
    return this.svc.create(userId, body);
  }

  @Patch(':id')
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(CategoryUpdateSchema)) body: z.infer<typeof CategoryUpdateSchema>,
  ) {
    return this.svc.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.svc.archive(userId, id);
  }
}

@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
