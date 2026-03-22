import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomException } from '../errors/custom-exception';
import { captureException } from './capture-exception';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof HttpException) {
          if (error.getStatus() >= 500) {
            captureException({
              error,
              context,
              logger: this.logger,
            });
          }
          return throwError(() => error);
        }

        captureException({
          error,
          context,
          logger: this.logger,
        });

        const message =
          error instanceof CustomException
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Internal server error';

        return throwError(() => new InternalServerErrorException(message));
      }),
    );
  }
}
