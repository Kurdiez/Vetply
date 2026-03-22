import { Controller, Get } from '@nestjs/common';
import { Public } from '~/auth/public.decorator';

@Public()
@Controller()
export class AppController {
  @Get()
  root(): { service: string } {
    return { service: 'vetply-server' };
  }
}
