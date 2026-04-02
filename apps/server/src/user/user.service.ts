import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGetMeRes, userGetMeResSchema } from '@vetply/shared';
import { Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { UserEntity } from '~/database/entities/user.entity';

const STUB_FIRST_NAME = 'Jamie';
const STUB_CLINIC_ID = 'stub-clinic-id';
const STUB_CLINIC_NAME = 'Stub Animal Hospital';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getMeForRequest(userId: string): Promise<UserGetMeRes> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const raw = {
      userId: user.id,
      email: user.email,
      firstName: STUB_FIRST_NAME,
      clinicId: STUB_CLINIC_ID,
      clinicName: STUB_CLINIC_NAME,
      userType: user.userType,
    };
    return zodResTransform(raw, userGetMeResSchema) as UserGetMeRes;
  }
}
