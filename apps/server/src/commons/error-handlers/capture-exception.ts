import { ExecutionContext, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request } from 'express';
import {
  CustomException,
  getPrintableErrorMessages,
} from '../errors/custom-exception';
import { shouldExcludeFromSentry } from './sentry-error-filter';

function addCustomBreadcrumb(scope: Sentry.Scope, error: unknown) {
  if (!(error instanceof CustomException)) return;

  addCustomBreadcrumb(scope, error.cause);

  const stringifiedContext: Record<string, string> = {};
  if (error.context) {
    for (const [key, value] of Object.entries(error.context)) {
      stringifiedContext[key] = JSON.stringify(value, null, 2);
    }
  }

  scope.addBreadcrumb({
    type: 'error',
    category: 'exception',
    level: 'error',
    message: `${error.name}: ${error.message}`,
    data: stringifiedContext,
    timestamp: error.createdAt.getTime() / 1000,
  });
}

export function captureException({
  error,
  context,
  logger,
}: {
  error: unknown;
  context?: ExecutionContext;
  logger?: Logger;
}) {
  (logger ?? console).error(getPrintableErrorMessages(error));

  const isDevelopment = process.env.ENVIRONMENT === 'development';

  if (!isDevelopment && !shouldExcludeFromSentry(error)) {
    Sentry.withScope((scope) => {
      if (error instanceof CustomException) {
        addCustomBreadcrumb(scope, error.cause);
      }

      if (context) {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();

        if (request) {
          scope.setContext('request', {
            method: request.method,
            url: request.url,
            headers: request.headers,
            ip: request.ip,
          });

          if (request.userId) {
            scope.setUser({ id: request.userId });
            scope.setTag('userId', request.userId);
          }
        }
      }

      Sentry.captureException(
        error,
        error instanceof CustomException ? { extra: error.context } : undefined,
      );
    });
  }
}
