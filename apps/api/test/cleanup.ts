import type { PrismaService } from '../src/common/prisma.module';

/** 테스트 사용자와 그 사용자가 속한 가계부(데이터 포함)를 지운다. Book 은 사용자에 cascade 되지 않으므로 먼저 지운다. */
export async function deleteUsers(prisma: PrismaService, emails: string[]) {
  await prisma.book.deleteMany({ where: { members: { some: { user: { email: { in: emails } } } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}
