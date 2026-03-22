import { Module } from '@nestjs/common';
import { ConfigModule as NestjsConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryInterceptor } from '~/commons/error-handlers/sentry-interceptor';
import { ConfigModule, configSchema } from '~/config';
import { databaseConnections } from '~/database/connections';
import { DatabaseModule } from '~/database/database.module';
import { ExampleModule } from '~/example/example.module';
import { JobsModule } from '~/jobs/jobs.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    NestjsConfigModule.forRoot({
      validate: (env) => configSchema.parse(env),
      expandVariables: false,
    }),
    ConfigModule,
    ...databaseConnections,
    DatabaseModule,
    JobsModule,
    ExampleModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule {}
