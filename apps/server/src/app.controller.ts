import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root(): { service: string } {
    return { service: 'vetply-server' };
  }
}
