import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';
import { CustomException } from './errors/custom-exception';

const zodReqTransform = (value: unknown, schema: ZodSchema) => {
  try {
    return schema.parse(value);
  } catch (error) {
    throw new BadRequestException(
      error instanceof ZodError
        ? {
            statusCode: 400,
            message: 'Validation failed',
            error: 'Bad Request',
            details: error.issues,
          }
        : 'Validation failed',
    );
  }
};

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    return zodReqTransform(value, this.schema);
  }
}

export const zodResTransform = <T>(
  value: unknown,
  schema: ZodSchema<T>,
): T | null => {
  if (value === null) {
    return null;
  }
  try {
    return schema.parse(value);
  } catch (error) {
    const exception = new CustomException('API return value transform failed', {
      error,
      value: JSON.stringify(value, null, 2),
    });
    throw exception;
  }
};
