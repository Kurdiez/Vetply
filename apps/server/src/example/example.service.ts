import { Injectable } from '@nestjs/common';
import {
  ExampleEchoReq,
  ExampleEchoRes,
  exampleEchoResSchema,
} from '@vetply/shared';
import { zodResTransform } from '~/commons/validations';

@Injectable()
export class ExampleService {
  echo(body: ExampleEchoReq): ExampleEchoRes {
    const raw = {
      message: body.message,
      echoedAt: new Date().toISOString(),
    };
    return zodResTransform(raw, exampleEchoResSchema);
  }
}
