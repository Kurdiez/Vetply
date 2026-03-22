import { Controller, Get } from '@nestjs/common';
import { CurrentUserId } from '~/auth/current-user-id.decorator';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('get-me')
  getMe(@CurrentUserId() userId: string) {
    return this.userService.getMeForRequest(userId);
  }
}
