import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtValidatedUser } from './jwt.strategy';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtValidatedUser }>();
    return request.user.userId;
  },
);
