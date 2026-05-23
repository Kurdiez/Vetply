import type { Page } from 'playwright';

const PRODUCTS_GRID = '#productsGrid';

function scrollGridBody(el: HTMLElement, delta: number): void {
  const sr = el.shadowRoot;
  const body =
    sr?.querySelector('[part~="body"]') ?? sr?.querySelector('.cells-body');
  const target = (body as HTMLElement | null) ?? el;
  target.scrollTop += delta;
}

export async function scrollProductsGridDown(page: Page): Promise<void> {
  const grid = page.locator(PRODUCTS_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });
  await grid.hover({ timeout: 10_000 }).catch(() => undefined);
  await page.mouse.wheel(0, 550);
  await page
    .locator(PRODUCTS_GRID)
    .evaluate((el: HTMLElement) => scrollGridBody(el, 650))
    .catch(() => undefined);
}

export async function scrollProductsGridToBottom(page: Page): Promise<void> {
  const grid = page.locator(PRODUCTS_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });
  await grid.hover({ timeout: 10_000 }).catch(() => undefined);
  await page
    .locator(PRODUCTS_GRID)
    .evaluate((el: HTMLElement) => {
      const sr = el.shadowRoot;
      const body =
        sr?.querySelector('[part~="body"]') ?? sr?.querySelector('.cells-body');
      const target = (body as HTMLElement | null) ?? el;
      target.scrollTop = target.scrollHeight;
    })
    .catch(() => undefined);
  await page.mouse.wheel(0, 1200);
}
