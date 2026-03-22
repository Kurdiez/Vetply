import { Body, Controller, Post } from '@nestjs/common';
import {
  CreateAccountReq,
  LoginReq,
  createAccountReqSchema,
  loginReqSchema,
} from '@vetply/shared';
import { ZodValidationPipe } from '~/commons/validations';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('account/create')
  createAccount(
    @Body(new ZodValidationPipe(createAccountReqSchema)) body: CreateAccountReq,
  ) {
    return this.authService.createAccount(body.email, body.password);
  }

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginReqSchema)) body: LoginReq) {
    return this.authService.login(body.email, body.password);
  }
}
