import { Logger } from '@nestjs/common';
import type { Page } from 'playwright';

const logger = new Logger('CovetrusCategoryTree');

const TREE_GRID = '#category-tree-grid';

export async function clickCategoryRowInTree(
  page: Page,
  categoryLabel: string,
): Promise<void> {
  const trimmed = categoryLabel.trim();

  const grid = page.locator(TREE_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });
  const pattern = new RegExp(`^\\s*${escapeRegExp(trimmed)}\\s*\\(`, 'i');

  try {
    await grid.getByText(pattern).first().click({ timeout: 15_000 });
  } catch (err) {
    logger.warn(
      `Category tree click failed for label=${trimmed}: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
