import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateAccountFailReason,
  CreateAccountRes,
  createAccountResSchema,
  loginResSchema,
} from '@vetply/shared';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { UserEntity } from '~/database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async createAccount(
    email: string,
    password: string,
  ): Promise<CreateAccountRes> {
    const normalized = email.toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: normalized },
    });
    if (existing) {
      const failReason = this.resolveDuplicateFailReason(existing);
      throw new BadRequestException({ failReason });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.userRepository.create({
      email: normalized,
      passwordHash,
      googleSub: null,
    });
    await this.userRepository.save(user);
    const raw = this.buildAuthResponse(user);
    return zodResTransform(raw, createAccountResSchema) as CreateAccountRes;
  }

  async login(email: string, password: string): Promise<CreateAccountRes> {
    const normalized = email.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalized },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const raw = this.buildAuthResponse(user);
    return zodResTransform(raw, loginResSchema) as CreateAccountRes;
  }

  private resolveDuplicateFailReason(
    user: UserEntity,
  ): CreateAccountFailReason {
    if (user.passwordHash) {
      return 'ACCOUNT_EXISTS_VETPLY';
    }
    if (user.googleSub) {
      return 'ACCOUNT_EXISTS_GOOGLE';
    }
    return 'ACCOUNT_EXISTS_VETPLY';
  }

  private buildAuthResponse(user: UserEntity) {
    const accessToken = this.jwtService.sign({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, email: user.email },
    };
  }
}
