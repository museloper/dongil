import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import type { AuthResponse, UserDto } from '@dongil/shared';
import { PrismaService } from '../../common/prisma.module';
import { accessSecret } from '../../common/auth.guard';
import { DEFAULT_CATEGORIES } from './default-categories';

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  email: u.email,
  nickname: u.nickname,
  currency: u.currency,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: { email: string; password: string; nickname: string }): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('이미 가입된 이메일입니다');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname: input.nickname,
        categories: { create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })) },
        accounts: { create: [{ name: '현금', type: 'CASH', color: '#20C997' }] },
      },
    });
    return this.issue(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    return this.issue(user);
  }

  /** Refresh 토큰 회전: 사용된 토큰은 즉시 폐기하고 새 쌍을 발급 */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('다시 로그인해 주세요');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issue(stored.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toUserDto(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    const accessToken = this.jwt.sign({ sub: user.id }, { secret: accessSecret(), expiresIn: ACCESS_TTL });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
    });
    return { accessToken, refreshToken, user: toUserDto(user) };
  }
}
