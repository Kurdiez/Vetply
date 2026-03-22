export class CustomException extends Error {
  readonly cause?: unknown;
  readonly code?: unknown;
  readonly context?: { [key: string]: unknown };
  readonly excludeFromSentry?: boolean;
  readonly createdAt: Date;

  constructor(
    message: string,
    {
      error,
      code,
      excludeFromSentry,
      ...context
    }: {
      error?: unknown;
      code?: unknown;
      excludeFromSentry?: boolean;
      [key: string]: unknown;
    } = {},
  ) {
    super(message);
    this.name = CustomException.name;
    this.cause = error;
    this.code = code;
    this.excludeFromSentry = excludeFromSentry;
    this.context = context;
    this.createdAt = new Date();
  }
}

export const getErrorMessages = (
  error: unknown,
  _messages?: string[],
): string[] => {
  const messages = _messages ?? [];
  if (error instanceof CustomException) {
    messages.push(
      `${error.name}: ${error.message} :: context: ${JSON.stringify(
        error.context,
      )}`,
    );
    if (error.cause) {
      getErrorMessages(error.cause, messages);
    }
  } else if (error instanceof Error) {
    messages.push(error.stack ?? `${error.name}: ${error.message}`);
  }
  return messages;
};

export const getPrintableErrorMessages = (
  error: unknown,
  messages?: string[],
) => {
  return getErrorMessages(error, messages)
    .map((message, index) => `${index + 1}) ${message}`)
    .join('\n\n');
};
