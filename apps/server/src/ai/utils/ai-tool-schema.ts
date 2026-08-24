export function parseToolArgumentsJson(
  argumentsJson: string,
): Record<string, unknown> {
  const trimmed = argumentsJson.trim();
  if (trimmed === '') {
    return {};
  }

  const parsed: unknown = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tool call arguments must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}
