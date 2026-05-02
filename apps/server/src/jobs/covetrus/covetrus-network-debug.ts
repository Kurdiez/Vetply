import type { Page, Response } from 'playwright';

const BODY_PREVIEW_MAX = 16_000;

function shouldCaptureBody(url: string, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes('json') || ct.includes('javascript')) {
    return true;
  }
  if (ct.includes('text/html') || ct.includes('text/plain')) {
    return true;
  }
  if (/VAADIN|uidl|\?v-r=|heartbeat/i.test(url)) {
    return true;
  }
  return false;
}

export function attachCovetrusRpcNetworkLogging(page: Page): () => void {
  const handler = async (response: Response) => {
    const request = response.request();
    const url = response.url();
    const resourceType = request.resourceType();
    if (
      resourceType === 'image' ||
      resourceType === 'font' ||
      resourceType === 'media'
    ) {
      return;
    }
    const contentType = response.headers()['content-type'] ?? '';
    let bodyPreview: string | undefined;
    if (shouldCaptureBody(url, contentType)) {
      try {
        const text = await response.text();
        bodyPreview =
          text.length > BODY_PREVIEW_MAX
            ? `${text.slice(0, BODY_PREVIEW_MAX)}…[truncated ${text.length} chars]`
            : text;
      } catch {
        bodyPreview = '[unreadable]';
      }
    }
    console.log(
      JSON.stringify({
        covetrusNet: true,
        requestMethod: request.method(),
        responseStatus: response.status(),
        contentType: contentType || undefined,
        resourceType,
        url,
        bodyPreview,
      }),
    );
  };
  page.on('response', handler);
  return () => {
    page.off('response', handler);
  };
}
