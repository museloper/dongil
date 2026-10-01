import { Body, Controller, Delete, Get, HttpCode, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookCreateSchema, BookUpdateSchema, JoinBookSchema } from '@dongil/shared';
import { z } from 'zod';
import { UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { BooksService } from './books.service';

@ApiTags('books')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly svc: BooksService) {}

  @Get()
  list(@UserId() userId: string) {
    return this.svc.list(userId);
  }

  @Post()
  create(@UserId() userId: string, @Body(new ZodPipe(BookCreateSchema)) body: z.infer<typeof BookCreateSchema>) {
    return this.svc.create(userId, body.name);
  }

  // ':bookId' 보다 먼저 선언해야 'join' 이 id 로 해석되지 않는다
  @Post('join')
  @HttpCode(200)
  join(@UserId() userId: string, @Body(new ZodPipe(JoinBookSchema)) body: z.infer<typeof JoinBookSchema>) {
    return this.svc.join(userId, body.code);
  }

  @Patch(':bookId')
  rename(
    @UserId() userId: string,
    @Param('bookId') bookId: string,
    @Body(new ZodPipe(BookUpdateSchema)) body: z.infer<typeof BookUpdateSchema>,
  ) {
    return this.svc.rename(userId, bookId, body.name);
  }

  @Delete(':bookId')
  @HttpCode(204)
  remove(@UserId() userId: string, @Param('bookId') bookId: string) {
    return this.svc.remove(userId, bookId);
  }

  @Post(':bookId/invite')
  invite(@UserId() userId: string, @Param('bookId') bookId: string) {
    return this.svc.invite(userId, bookId);
  }

  @Delete(':bookId/members/:userId')
  @HttpCode(204)
  removeMember(@UserId() userId: string, @Param('bookId') bookId: string, @Param('userId') target: string) {
    return this.svc.removeMember(userId, bookId, target);
  }
}

@Module({ controllers: [BooksController], providers: [BooksService] })
export class BooksModule {}
