import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '~/auth/public.decorator';
import {
  ExampleEchoReq,
  exampleEchoReqSchema,
  ExampleEchoRes,
} from '@vetply/shared';
import { ZodValidationPipe } from '~/commons/validations';
import { ExampleService } from './example.service';

@Public()
@Controller()
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get('health')
  health(): { ok: true } {
    return { ok: true };
  }

  @Post('example/echo')
  echo(
    @Body(new ZodValidationPipe(exampleEchoReqSchema)) body: ExampleEchoReq,
  ): ExampleEchoRes {
    return this.exampleService.echo(body);
  }
}
