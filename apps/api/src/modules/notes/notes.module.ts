import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NoteCreateSchema, NoteUpdateSchema, type MemberRole, type NoteInput } from '@dongil/shared';
import { UserId } from '../../common/auth.guard';
import { PrismaService } from '../../common/prisma.module';
import { BookAccessGuard, BookId } from '../../common/book-access.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { noteInclude, toNoteDto } from '../../common/mappers';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(bookId: string) {
    const rows = await this.prisma.bookNote.findMany({ where: { bookId }, include: noteInclude, orderBy: { updatedAt: 'desc' } });
    return rows.map(toNoteDto);
  }

  async create(bookId: string, userId: string, input: NoteInput) {
    const row = await this.prisma.bookNote.create({ data: { bookId, authorId: userId, content: input.content }, include: noteInclude });
    return toNoteDto(row);
  }

  /** 수정은 작성자만. 작성자(authorId)는 바꾸지 않는다 */
  async update(bookId: string, userId: string, id: string, input: NoteInput) {
    const note = await this.find(bookId, id);
    if (note.authorId !== userId) throw new ForbiddenException('내가 쓴 메모만 수정할 수 있습니다');
    const row = await this.prisma.bookNote.update({ where: { id }, data: { content: input.content }, include: noteInclude });
    return toNoteDto(row);
  }

  /** 삭제는 작성자 또는 OWNER. 내보낸 멤버가 남긴 메모도 OWNER 가 정리할 수 있게 한다 */
  async remove(bookId: string, userId: string, role: MemberRole, id: string) {
    const note = await this.find(bookId, id);
    if (note.authorId !== userId && role !== 'OWNER') throw new ForbiddenException('내가 쓴 메모만 삭제할 수 있습니다');
    await this.prisma.bookNote.delete({ where: { id } });
  }

  private async find(bookId: string, id: string) {
    const found = await this.prisma.bookNote.findFirst({ where: { id, bookId } });
    if (!found) throw new NotFoundException('메모를 찾을 수 없습니다');
    return found;
  }
}

@ApiTags('notes')
@ApiBearerAuth()
@Controller('books/:bookId/notes')
@UseGuards(BookAccessGuard)
export class NotesController {
  constructor(private readonly svc: NotesService) {}

  @Get()
  list(@BookId() bookId: string) {
    return this.svc.list(bookId);
  }

  @Post()
  create(@BookId() bookId: string, @UserId() userId: string, @Body(new ZodPipe(NoteCreateSchema)) body: NoteInput) {
    return this.svc.create(bookId, userId, body);
  }

  @Patch(':id')
  update(
    @BookId() bookId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(NoteUpdateSchema)) body: NoteInput,
  ) {
    return this.svc.update(bookId, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@BookId() bookId: string, @UserId() userId: string, @Req() req: { bookRole: MemberRole }, @Param('id') id: string) {
    return this.svc.remove(bookId, userId, req.bookRole, id);
  }
}

@Module({ controllers: [NotesController], providers: [NotesService] })
export class NotesModule {}
