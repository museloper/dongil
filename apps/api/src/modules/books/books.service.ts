import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type BookType } from '@prisma/client';
import { randomInt } from 'crypto';
import {
  BOOK_MAX_MEMBERS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  type BookDto,
  type InviteDto,
} from '@dongil/shared';
import { PrismaService } from '../../common/prisma.module';
import { DEFAULT_CATEGORIES } from '../auth/default-categories';

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const bookInclude = {
  members: { include: { user: { select: { id: true, nickname: true } } }, orderBy: { joinedAt: 'asc' } },
} satisfies Prisma.BookInclude;
type BookWithMembers = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

function toBookDto(book: BookWithMembers, userId: string): BookDto {
  return {
    id: book.id,
    name: book.name,
    type: book.type,
    role: book.members.find((m) => m.userId === userId)?.role ?? 'MEMBER',
    members: book.members.map((m) => ({ userId: m.userId, nickname: m.user.nickname, role: m.role })),
  };
}

function generateCode() {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]).join('');
}

/**
 * 가계부를 기본 카테고리와 "현금" 계좌와 함께 만든다.
 * 회원가입(개인 가계부)과 공유 가계부 생성이 함께 쓴다.
 */
export async function createBookWithDefaults(
  tx: Prisma.TransactionClient,
  input: { userId: string; name: string; type: BookType },
) {
  return tx.book.create({
    data: {
      name: input.name,
      type: input.type,
      members: { create: { userId: input.userId, role: 'OWNER' } },
      categories: { create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })) },
      accounts: { create: [{ name: '현금', type: 'CASH', color: '#20C997' }] },
    },
  });
}

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<BookDto[]> {
    const books = await this.prisma.book.findMany({
      where: { members: { some: { userId } } },
      include: bookInclude,
      // 개인 가계부를 맨 앞에
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    return books.map((b) => toBookDto(b, userId));
  }

  async create(userId: string, name: string): Promise<BookDto> {
    const book = await this.prisma.$transaction((tx) => createBookWithDefaults(tx, { userId, name, type: 'SHARED' }));
    return this.get(userId, book.id);
  }

  async rename(userId: string, bookId: string, name: string): Promise<BookDto> {
    await this.membership(userId, bookId);
    await this.prisma.book.update({ where: { id: bookId }, data: { name } });
    return this.get(userId, bookId);
  }

  async remove(userId: string, bookId: string) {
    const { book, member } = await this.membership(userId, bookId);
    if (book.type === 'PERSONAL') throw new BadRequestException('개인 가계부는 삭제할 수 없습니다');
    if (member.role !== 'OWNER') throw new ForbiddenException('가계부를 만든 사람만 삭제할 수 있습니다');
    await this.prisma.book.delete({ where: { id: bookId } });
  }

  /** 새 초대 코드 발급. 기존 미사용 코드는 무효화 */
  async invite(userId: string, bookId: string): Promise<InviteDto> {
    const { book } = await this.membership(userId, bookId);
    if (book.type === 'PERSONAL') throw new BadRequestException('개인 가계부에는 초대할 수 없습니다');
    if (book.members.length >= BOOK_MAX_MEMBERS) throw new ConflictException('이미 인원이 가득 찼습니다');

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [, invite] = await this.prisma.$transaction([
          this.prisma.bookInvite.deleteMany({ where: { bookId, usedAt: null } }),
          this.prisma.bookInvite.create({ data: { bookId, code: generateCode(), createdById: userId, expiresAt } }),
        ]);
        return { code: invite.code, expiresAt: invite.expiresAt.toISOString() };
      } catch (e) {
        // 코드 충돌(unique)일 때만 재시도
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ConflictException('초대 코드를 만들지 못했습니다. 다시 시도해 주세요');
  }

  async join(userId: string, code: string): Promise<BookDto> {
    const bookId = await this.prisma.$transaction(
      async (tx) => {
        const invite = await tx.bookInvite.findUnique({ where: { code } });
        if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
          throw new BadRequestException('유효하지 않거나 만료된 초대 코드입니다');
        }
        const members = await tx.bookMember.findMany({ where: { bookId: invite.bookId } });
        if (members.some((m) => m.userId === userId)) throw new ConflictException('이미 참여 중인 가계부입니다');
        if (members.length >= BOOK_MAX_MEMBERS) throw new ConflictException('이미 인원이 가득 찼습니다');

        await tx.bookMember.create({ data: { bookId: invite.bookId, userId, role: 'MEMBER' } });
        await tx.bookInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
        return invite.bookId;
      },
      // 두 사람이 동시에 같은 가계부에 참여해 정원을 넘기지 않도록
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.get(userId, bookId);
  }

  /** 본인이면 나가기, OWNER 가 다른 멤버를 지정하면 내보내기 */
  async removeMember(userId: string, bookId: string, targetUserId: string) {
    const { book, member } = await this.membership(userId, bookId);
    if (book.type === 'PERSONAL') throw new BadRequestException('개인 가계부에서는 나갈 수 없습니다');
    const target = book.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('멤버를 찾을 수 없습니다');

    if (targetUserId === userId) {
      if (member.role === 'OWNER') throw new BadRequestException('만든 사람은 나갈 수 없습니다. 가계부를 삭제해 주세요');
    } else if (member.role !== 'OWNER') {
      throw new ForbiddenException('가계부를 만든 사람만 멤버를 내보낼 수 있습니다');
    }
    await this.prisma.bookMember.delete({ where: { bookId_userId: { bookId, userId: targetUserId } } });
  }

  private async get(userId: string, bookId: string): Promise<BookDto> {
    const book = await this.prisma.book.findUniqueOrThrow({ where: { id: bookId }, include: bookInclude });
    return toBookDto(book, userId);
  }

  private async membership(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId }, include: bookInclude });
    const member = book?.members.find((m) => m.userId === userId);
    if (!book || !member) throw new NotFoundException('가계부를 찾을 수 없습니다');
    return { book, member };
  }
}
