import type { Page } from 'playwright';

const PRODUCTS_GRID = '#productsGrid';

export async function scrollProductsGridDown(page: Page): Promise<void> {
  const grid = page.locator(PRODUCTS_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });
  await grid.hover({ timeout: 10_000 }).catch(() => undefined);
  await page.mouse.wheel(0, 550);
  await page
    .locator(PRODUCTS_GRID)
    .evaluate((el: HTMLElement) => {
      const sr = el.shadowRoot;
      const body =
        sr?.querySelector('[part~="body"]') ?? sr?.querySelector('.cells-body');
      const target = (body as HTMLElement | null) ?? el;
      target.scrollTop += 650;
    })
    .catch(() => undefined);
}
