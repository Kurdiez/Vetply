import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ConfigService } from '~/config';
import type { JwtValidatedUser } from './jwt.strategy';
import { IS_PUBLIC_KEY } from './public.decorator';
import {
  readSingleHeader,
  resolveTestUserImpersonation,
} from './test-user-impersonation';

type RequestWithUser = Request & { user?: JwtValidatedUser };

@Injectable()
export class AppJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(AppJwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.path?.startsWith('/system')) {
      return true;
    }

    if (this.tryAuthenticateAsTestUser(request)) {
      return true;
    }

    return super.canActivate(context);
  }

  private tryAuthenticateAsTestUser(request: RequestWithUser): boolean {
    const result = resolveTestUserImpersonation({
      expectedSecret: this.configService.get('SYSTEM_SECRET'),
      systemSecretHeader: readSingleHeader(request.headers['x-system-secret']),
      testUserIdHeader: readSingleHeader(request.headers['x-test-user-id']),
    });

    if (result.kind === 'not_attempted') {
      return false;
    }

    if (result.kind === 'rejected') {
      this.logger.warn(`Test user impersonation rejected: ${result.reason}`);
      throw new UnauthorizedException(result.reason);
    }

    request.user = { userId: result.userId };
    this.logger.log(
      `Authenticated via test user impersonation userId=${result.userId}`,
    );
    return true;
  }
}
