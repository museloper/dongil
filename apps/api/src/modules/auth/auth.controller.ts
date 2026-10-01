import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginSchema, RefreshSchema, SignupSchema } from '@dongil/shared';
import { z } from 'zod';
import { Public, UserId } from '../../common/auth.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('auth/signup')
  signup(@Body(new ZodPipe(SignupSchema)) body: z.infer<typeof SignupSchema>) {
    return this.auth.signup(body);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/login')
  login(@Body(new ZodPipe(LoginSchema)) body: z.infer<typeof LoginSchema>) {
    return this.auth.login(body);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/refresh')
  refresh(@Body(new ZodPipe(RefreshSchema)) body: z.infer<typeof RefreshSchema>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Public()
  @HttpCode(204)
  @Post('auth/logout')
  async logout(@Body(new ZodPipe(RefreshSchema)) body: z.infer<typeof RefreshSchema>) {
    await this.auth.logout(body.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@UserId() userId: string) {
    return this.auth.me(userId);
  }
}
