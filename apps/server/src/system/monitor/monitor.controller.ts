import { Controller, Get } from '@nestjs/common';
import { Public } from '~/auth/public.decorator';

@Public()
@Controller('system/monitor')
export class MonitorController {
  @Get('health')
  health(): { ok: true } {
    return { ok: true };
  }
}
