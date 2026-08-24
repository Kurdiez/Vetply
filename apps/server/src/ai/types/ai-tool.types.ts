export type AiToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema object describing tool arguments. */
  parameters: Record<string, unknown>;
};

export type AiToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;
