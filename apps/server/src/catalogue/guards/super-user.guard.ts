import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserType } from '@vetply/shared';
import { Repository } from 'typeorm';
import type { JwtValidatedUser } from '~/auth/jwt.strategy';
import { UserEntity } from '~/database/entities/user.entity';

@Injectable()
export class SuperUserGuard implements CanActivate {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtValidatedUser }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.userType !== UserType.Super) {
      throw new ForbiddenException();
    }
    return true;
  }
}
