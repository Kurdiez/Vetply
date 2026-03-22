import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('example')
export class ExampleQueueConsumer extends WorkerHost {
  private readonly logger = new Logger(ExampleQueueConsumer.name);

  async process(job: Job<{ kind: string }>): Promise<void> {
    this.logger.log(
      `Example job ${job.id} payload=${JSON.stringify(job.data)}`,
    );
  }
}
