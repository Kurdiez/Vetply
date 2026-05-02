import type { Page } from 'playwright';

const TREE_GRID = '#category-tree-grid';

export async function clickCategoryRowInTree(
  page: Page,
  categoryLabel: string,
): Promise<void> {
  const grid = page.locator(TREE_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(categoryLabel.trim())}\\s*\\(`,
    'i',
  );
  await grid.getByText(pattern).first().click({ timeout: 15_000 });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
