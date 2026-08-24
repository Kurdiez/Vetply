import { parseToolArgumentsJson } from '../utils/ai-tool-schema';

describe('parseToolArgumentsJson', () => {
  it('parses an empty string as an empty object', () => {
    expect(parseToolArgumentsJson('')).toEqual({});
    expect(parseToolArgumentsJson('   ')).toEqual({});
  });

  it('parses a JSON object', () => {
    expect(parseToolArgumentsJson('{"q":"syringe"}')).toEqual({
      q: 'syringe',
    });
  });

  it('rejects non-object JSON', () => {
    expect(() => parseToolArgumentsJson('[]')).toThrow(
      'Tool call arguments must be a JSON object',
    );
    expect(() => parseToolArgumentsJson('"x"')).toThrow(
      'Tool call arguments must be a JSON object',
    );
  });
});
