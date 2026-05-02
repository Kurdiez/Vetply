import { Module } from '@nestjs/common';
import { ConfigModule as NestjsConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryInterceptor } from '~/commons/error-handlers/sentry-interceptor';
import { ConfigModule, configSchema } from '~/config';
import { databaseConnections } from '~/database/connections';
import { DatabaseModule } from '~/database/database.module';
import { AuthModule } from '~/auth/auth.module';
import { ExampleModule } from '~/example/example.module';
import { SystemModule } from '~/system/system.module';
import { UserModule } from '~/user/user.module';
import { JobsModule } from '~/jobs/jobs.module';
import { AppController } from './app.controller';
import { CatalogueModule } from '~/catalogue/catalogue.module';

@Module({
  imports: [
    NestjsConfigModule.forRoot({
      validate: (env) => configSchema.parse(env),
      expandVariables: false,
    }),
    ConfigModule,
    ...databaseConnections,
    DatabaseModule,
    AuthModule,
    UserModule,
    JobsModule,
    ExampleModule,
    SystemModule,
    CatalogueModule,
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
