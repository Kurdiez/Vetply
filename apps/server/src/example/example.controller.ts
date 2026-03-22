import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ExampleEchoReq,
  exampleEchoReqSchema,
  ExampleEchoRes,
} from '@vetply/shared';
import { ZodValidationPipe } from '~/commons/validations';
import { ExampleService } from './example.service';

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
