import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const accessSecret = () => process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';

/** 컨트롤러에서 @UserId() userId: string 으로 로그인 사용자 id를 받는다 */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().userId;
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('로그인이 필요합니다');
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, { secret: accessSecret() });
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('토큰이 만료되었거나 올바르지 않습니다');
    }
  }
}
