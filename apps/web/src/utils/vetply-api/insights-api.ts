import {
  InsightsChatSendReq,
  InsightsChatStreamEvent,
  insightsChatSendReqSchema,
  insightsChatStreamEventSchema,
  vetplyBusinessErrorBodySchema,
} from '@vetply/shared';
import { getPublicApiBaseUrl } from './base-url';
import { VETPLY_ACCESS_TOKEN_KEY } from './storage';
import { VetplyBadRequestError } from './vetply-bad-request-error';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(VETPLY_ACCESS_TOKEN_KEY);
}

export type StreamInsightsChatHandlers = {
  onEvent: (event: InsightsChatStreamEvent) => void;
  signal?: AbortSignal;
};

export async function streamInsightsChatSend(
  rawBody: InsightsChatSendReq,
  handlers: StreamInsightsChatHandlers,
): Promise<void> {
  const body = insightsChatSendReqSchema.parse(rawBody);
  const response = await fetchInsightsChatSend(body, handlers.signal);
  await consumeInsightsSseResponse(response, handlers.onEvent);
}

async function fetchInsightsChatSend(
  body: InsightsChatSendReq,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const token = readStoredToken();
  const jsonBody = JSON.stringify(body);
  const compressed = await maybeGzipJsonBody(jsonBody);

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/json',
  };
  if (compressed) {
    headers['Content-Encoding'] = 'gzip';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getPublicApiBaseUrl()}/insights/chat/send`, {
    method: 'POST',
    headers,
    body: compressed ?? jsonBody,
    signal,
  });

  if (!response.ok) {
    await throwForFailedInsightsResponse(response);
  }

  return response;
}

async function maybeGzipJsonBody(jsonBody: string): Promise<Blob | null> {
  // Skip tiny payloads — gzip overhead can outweigh savings.
  if (jsonBody.length < 1024 || typeof CompressionStream === 'undefined') {
    return null;
  }

  try {
    const stream = new Blob([jsonBody])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
  } catch {
    return null;
  }
}

async function throwForFailedInsightsResponse(
  response: Response,
): Promise<never> {
  const data: unknown = await response.json().catch(() => undefined);
  if (
    response.status === 400 &&
    data !== undefined &&
    typeof data === 'object'
  ) {
    const parsed = vetplyBusinessErrorBodySchema.safeParse(data);
    if (parsed.success) {
      throw new VetplyBadRequestError(parsed.data.failReason);
    }
  }
  throw new Error(
    `Insights chat request failed with status ${response.status}`,
  );
}

async function consumeInsightsSseResponse(
  response: Response,
  onEvent: (event: InsightsChatStreamEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error('Insights chat response body was empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    buffer = emitCompleteSseBlocks(buffer, onEvent);
  }

  buffer += decoder.decode();
  emitCompleteSseBlocks(buffer, onEvent);
}

function emitCompleteSseBlocks(
  buffer: string,
  onEvent: (event: InsightsChatStreamEvent) => void,
): string {
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() ?? '';

  for (const block of parts) {
    const event = parseSseDataBlock(block);
    if (event) {
      onEvent(event);
    }
  }

  return remainder;
}

function parseSseDataBlock(block: string): InsightsChatStreamEvent | null {
  const dataLines = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart());

  if (dataLines.length === 0) {
    return null;
  }

  const raw = dataLines.join('\n');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = insightsChatStreamEventSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data : null;
}
