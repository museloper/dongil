import { CanActivate, createParamDecorator, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.module';

/**
 * `books/:bookId/...` 경로 전용. 로그인 사용자가 그 가계부의 멤버인지 확인한다.
 * 멤버가 아니면 가계부 존재 여부를 노출하지 않도록 404.
 * 전역 AuthGuard 다음에 실행되므로 req.userId 는 항상 채워져 있다.
 */
@Injectable()
export class BookAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const bookId: string | undefined = req.params.bookId;
    if (!bookId) throw new NotFoundException('가계부를 찾을 수 없습니다');
    const member = await this.prisma.bookMember.findUnique({
      where: { bookId_userId: { bookId, userId: req.userId } },
      select: { role: true },
    });
    if (!member) throw new NotFoundException('가계부를 찾을 수 없습니다');
    req.bookId = bookId;
    req.bookRole = member.role;
    return true;
  }
}

/** BookAccessGuard 를 통과한 가계부 id */
export const BookId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().bookId;
});
