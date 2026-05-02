import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '~/auth/public.decorator';
import { ConfigService } from '~/config';

@Injectable()
export class SystemGuard implements CanActivate {
  private readonly logger = new Logger(SystemGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!request.path.startsWith('/system')) {
      return true;
    }

    const raw = request.headers['x-system-secret'];
    const secretHeader = Array.isArray(raw) ? raw[0] : raw;
    const expectedSecret = this.configService.get('SYSTEM_SECRET');

    if (secretHeader !== expectedSecret) {
      this.logger.error('SystemGuard - Invalid system secret');
      throw new UnauthorizedException('Invalid system secret');
    }

    return true;
  }
}
