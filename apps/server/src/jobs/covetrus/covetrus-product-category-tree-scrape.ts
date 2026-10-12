import { Logger } from '@nestjs/common';
import type { Page } from 'playwright';

import { extractCategoriesFromSidebar } from './covetrus-catalog-sidebar';
import { dumpCovetrusCategoryPageForDebug } from './covetrus-product-category-page-dump';
import {
  collectLeafLabels,
  countTreeNodes,
  mergeLeveledRowsIntoForest,
  type ProductCategoryTreeNode,
} from './covetrus-product-category-tree';

const logger = new Logger('CovetrusProductCategoryTreeScrape');

const TREE_GRID = '#category-tree-grid';
const MAX_WALKS = 2;
const MAX_STEPS_PER_WALK = 400;
const SETTLE_MS = 800;
const MAX_EXPAND_FAILURES = 2;

export type TreeRowSnapshot = {
  text: string;
  label: string;
  level: number;
  expandable: boolean;
  expanded: boolean;
  slotName: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip trailing "(123)" product counts from Covetrus tree labels. */
export function parseCategoryTreeLabel(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed === '') {
    return null;
  }

  const matchCount = trimmed.match(/\(?([\d,]+)\s*\)?\s*$/);
  let label = trimmed;
  if (matchCount?.[1] != null && matchCount.index != null) {
    const num = Number(matchCount[1].replace(/,/g, ''));
    if (Number.isFinite(num)) {
      label = trimmed.slice(0, matchCount.index).trim();
    }
  }

  if (label.length < 2) {
    return null;
  }
  return label;
}

/** Keep deepest labels only when a fully ordered tree snapshot is available. */
export function selectLeafLabelsByLevel(
  rows: Array<{ label: string; level: number }>,
): string[] {
  const leaves: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row == null) {
      continue;
    }
    const next = rows[i + 1];
    const isLeaf = next == null || next.level <= row.level;
    if (!isLeaf) {
      continue;
    }
    const key = row.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    leaves.push(row.label);
  }

  return leaves;
}

export function applyTreeRowSnapshotsToLeafSet(
  rows: TreeRowSnapshot[],
  leaves: Set<string>,
  knownParents: Set<string>,
): void {
  for (const row of rows) {
    const key = row.label.toLowerCase();
    if (row.expandable || row.expanded) {
      knownParents.add(key);
      for (const existing of [...leaves]) {
        if (existing.toLowerCase() === key) {
          leaves.delete(existing);
        }
      }
      continue;
    }
    if (knownParents.has(key)) {
      continue;
    }
    leaves.add(row.label);
  }
}

export async function scrapeCategoryTreeFromPage(
  page: Page,
): Promise<ProductCategoryTreeNode[]> {
  const grid = page.locator(TREE_GRID);
  await grid.waitFor({ state: 'visible', timeout: 60_000 });

  const sidebarRows = await extractCategoriesFromSidebar(page);
  logger.log(
    `COVETRUS_PRODUCT_CATEGORY_TREE sidebarReady count=${sidebarRows.length} sample=${JSON.stringify(sidebarRows.slice(0, 6))}`,
  );

  await dumpCovetrusCategoryPageForDebug(page, 'after-sidebar-ready');

  const forest: ProductCategoryTreeNode[] = [];
  seedForestRootsFromSidebar(forest, sidebarRows);
  const leaves = new Set<string>();
  const knownParents = new Set<string>();
  const expandAttempted = new Set<string>();
  const expandFailures = new Map<string, number>();
  let dumpedAfterFirstExpand = false;

  for (let walk = 1; walk <= MAX_WALKS; walk += 1) {
    await scrollCategoryTreeToTop(page);
    await sleep(SETTLE_MS);

    let idleSteps = 0;
    for (let step = 0; step < MAX_STEPS_PER_WALK; step += 1) {
      const rows = await readTreeRows(page);
      mergeLeveledRowsIntoForest(forest, rows);
      applyTreeRowSnapshotsToLeafSet(rows, leaves, knownParents);

      if (step === 0 || step % 20 === 0) {
        logger.log(
          `COVETRUS_PRODUCT_CATEGORY_TREE walk=${walk} step=${step} rows=${rows.length} nodeCount=${countTreeNodes(forest)} leafCount=${leaves.size} parentCount=${knownParents.size} sample=${JSON.stringify(rows.slice(0, 8).map((r) => ({ label: r.label, level: r.level, expandable: r.expandable, expanded: r.expanded })))}`,
        );
      }

      const candidate = pickExpandCandidate(
        rows,
        knownParents,
        expandAttempted,
        expandFailures,
      );
      if (candidate == null) {
        const scrolled = await scrollCategoryTreeDown(page);
        if (scrolled) {
          await sleep(SETTLE_MS);
          idleSteps = 0;
          continue;
        }
        idleSteps += 1;
        if (idleSteps >= 6) {
          break;
        }
        continue;
      }

      const key = candidate.toLowerCase();
      expandAttempted.add(key);
      const beforeLabels = new Set(rows.map((r) => r.label.toLowerCase()));
      const beforeCount = rows.length;

      const clicked = await expandCategoryRowByLabel(page, candidate);
      await sleep(SETTLE_MS);
      const after = await readTreeRows(page);
      mergeLeveledRowsIntoForest(forest, after);
      const newLabels = after.filter(
        (r) => !beforeLabels.has(r.label.toLowerCase()),
      );
      const matched = after.find((r) => r.label.toLowerCase() === key);
      const grew = after.length > beforeCount || newLabels.length > 0;

      if (clicked && (grew || matched?.expanded === true)) {
        knownParents.add(key);
        for (const existing of [...leaves]) {
          if (existing.toLowerCase() === key) {
            leaves.delete(existing);
          }
        }
        logger.log(
          `COVETRUS_PRODUCT_CATEGORY_TREE expanded=${JSON.stringify(candidate)} newChildren=${newLabels.length}`,
        );
        if (!dumpedAfterFirstExpand) {
          dumpedAfterFirstExpand = true;
          await dumpCovetrusCategoryPageForDebug(
            page,
            `after-expand-${candidate.replace(/\s+/g, '-')}`,
          );
        }
        applyTreeRowSnapshotsToLeafSet(after, leaves, knownParents);
        idleSteps = 0;
        continue;
      }

      const failures = (expandFailures.get(key) ?? 0) + 1;
      expandFailures.set(key, failures);
      logger.warn(
        `COVETRUS_PRODUCT_CATEGORY_TREE expandFailed label=${JSON.stringify(candidate)} failures=${failures}`,
      );
      idleSteps = 0;
    }

    logger.log(
      `COVETRUS_PRODUCT_CATEGORY_TREE walk=${walk} nodeCount=${countTreeNodes(forest)} leafCount=${collectLeafLabels(forest).length} parentCount=${knownParents.size}`,
    );
  }

  const leafLabels = collectLeafLabels(forest);
  logger.log(
    `COVETRUS_PRODUCT_CATEGORY_TREE done nodeCount=${countTreeNodes(forest)} leafCount=${leafLabels.length}`,
  );

  await dumpCovetrusCategoryPageForDebug(
    page,
    forest.length === 0 ? 'no-tree-found' : 'final-state',
  );

  return forest;
}

function seedForestRootsFromSidebar(
  forest: ProductCategoryTreeNode[],
  sidebarRows: Array<{ label: string }>,
): void {
  mergeLeveledRowsIntoForest(
    forest,
    sidebarRows
      .map((row) => row.label.trim())
      .filter((label) => label.length >= 2)
      .map((label) => ({ label, level: 0 })),
  );
}

function pickExpandCandidate(
  rows: TreeRowSnapshot[],
  knownParents: Set<string>,
  expandAttempted: Set<string>,
  expandFailures: Map<string, number>,
): string | null {
  for (const row of rows) {
    if (row.expanded) {
      continue;
    }
    if (!row.expandable) {
      continue;
    }
    const key = row.label.toLowerCase();
    if (expandAttempted.has(key)) {
      continue;
    }
    if (knownParents.has(key) && row.expanded) {
      continue;
    }
    // Allow one re-expand if we previously marked parent but row is collapsed again
    // after virtualization — only if not attempted this session.
    if ((expandFailures.get(key) ?? 0) > MAX_EXPAND_FAILURES) {
      continue;
    }
    return row.label;
  }
  return null;
}

async function expandCategoryRowByLabel(
  page: Page,
  categoryLabel: string,
): Promise<boolean> {
  const trimmed = categoryLabel.trim();

  // Click the empty caret toggle in the same cell as the label text.
  // Covetrus puts label text as a sibling of <vaadin-grid-tree-toggle>, not inside it.
  const clicked = await page.evaluate((label) => {
    const grid = document.querySelector('#category-tree-grid');
    if (!grid) {
      return false;
    }
    const target = label.trim().toLowerCase();
    for (const cell of grid.querySelectorAll('vaadin-grid-cell-content')) {
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      const parsed = text.replace(/\s*\(?([\d,]+)\s*\)?\s*$/, '').trim();
      if (parsed.toLowerCase() !== target) {
        continue;
      }
      const toggle = cell.querySelector(
        'vaadin-grid-tree-toggle',
      ) as HTMLElement | null;
      if (!toggle) {
        return false;
      }
      const part = toggle.shadowRoot?.querySelector(
        '[part~="toggle"]',
      ) as HTMLElement | null;
      if (part) {
        part.click();
        return true;
      }
      toggle.click();
      return true;
    }
    return false;
  }, trimmed);

  if (clicked) {
    return true;
  }

  // Fallback: Playwright left-edge click on the visible label cell.
  const grid = page.locator(TREE_GRID);
  const pattern = new RegExp(`^\\s*${escapeRegExp(trimmed)}\\s*\\(`, 'i');
  const row = grid.getByText(pattern).first();
  try {
    await row.waitFor({ state: 'visible', timeout: 8_000 });
  } catch {
    return false;
  }
  const box = await row.boundingBox();
  if (box == null) {
    return false;
  }
  await page.mouse.click(box.x + 6, box.y + box.height / 2);
  return true;
}

/**
 * Join Vaadin shadow rows (aria-level / aria-expanded) with light-DOM cell labels
 * via slot names. Labels are siblings of empty vaadin-grid-tree-toggle nodes.
 */
async function readTreeRows(page: Page): Promise<TreeRowSnapshot[]> {
  return page.evaluate(() => {
    const grid = document.querySelector('#category-tree-grid');
    if (!grid) {
      return [] as TreeRowSnapshot[];
    }

    function parseLabel(raw: string): string | null {
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (!trimmed || /^categories$/i.test(trimmed)) {
        return null;
      }
      if (!/\([\d,]+\)\s*$/.test(trimmed)) {
        return null;
      }
      const label = trimmed.replace(/\s*\(?([\d,]+)\s*\)?\s*$/, '').trim();
      return label.length >= 2 ? label : null;
    }

    const out: TreeRowSnapshot[] = [];
    const seen = new Set<string>();
    const sr = grid.shadowRoot;

    if (sr) {
      for (const row of sr.querySelectorAll('[role="row"][aria-level]')) {
        const cell = row.querySelector('[role="gridcell"], td');
        const slotName =
          cell?.querySelector('slot')?.getAttribute('name') ?? null;
        const slotted = slotName
          ? grid.querySelector(`[slot="${slotName}"]`)
          : null;
        const text = (slotted?.textContent || '').replace(/\s+/g, ' ').trim();
        const label = parseLabel(text);
        if (label == null) {
          continue;
        }
        const key = label.toLowerCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const ariaExpanded = row.getAttribute('aria-expanded');
        const level = Number(row.getAttribute('aria-level') || '1');
        const toggle = slotted?.querySelector(
          'vaadin-grid-tree-toggle',
        ) as HTMLElement | null;
        const cssLevel = toggle
          ? Number(toggle.style.getPropertyValue('--_level'))
          : Number.NaN;

        out.push({
          text,
          label,
          level: Number.isFinite(cssLevel)
            ? cssLevel
            : Number.isFinite(level)
              ? Math.max(0, level - 1)
              : 0,
          // Parents expose aria-expanded; leaves do not.
          expandable: ariaExpanded != null,
          expanded: ariaExpanded === 'true' || row.hasAttribute('expanded'),
          slotName,
        });
      }
    }

    if (out.length > 0) {
      return out;
    }

    // Fallback: light-DOM cells only.
    for (const cell of grid.querySelectorAll('vaadin-grid-cell-content')) {
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      const label = parseLabel(text);
      if (label == null) {
        continue;
      }
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const toggle = cell.querySelector('vaadin-grid-tree-toggle') as
        | (HTMLElement & { leaf?: boolean; expanded?: boolean })
        | null;
      const cssLevel = toggle
        ? Number(toggle.style.getPropertyValue('--_level'))
        : 0;
      const leaf =
        toggle?.leaf === true || toggle?.hasAttribute('leaf') === true;
      out.push({
        text,
        label,
        level: Number.isFinite(cssLevel) ? cssLevel : 0,
        expandable: Boolean(toggle) && !leaf,
        expanded:
          toggle?.expanded === true ||
          toggle?.hasAttribute('expanded') === true,
        slotName: cell.getAttribute('slot'),
      });
    }

    return out;
  });
}

async function scrollCategoryTreeDown(page: Page): Promise<boolean> {
  const grid = page.locator(TREE_GRID);
  await grid.hover({ timeout: 5_000 }).catch(() => undefined);

  return grid
    .evaluate((el: HTMLElement) => {
      const sr = el.shadowRoot;
      const body =
        sr?.querySelector('[part~="body"]') ??
        sr?.querySelector('#table') ??
        sr?.querySelector('.cells-body');
      const target = (body as HTMLElement | null) ?? el;
      const before = target.scrollTop;
      const max = target.scrollHeight - target.clientHeight;
      if (max <= 0) {
        return false;
      }
      target.scrollTop = Math.min(before + 280, max);
      return target.scrollTop > before;
    })
    .catch(() => false);
}

async function scrollCategoryTreeToTop(page: Page): Promise<void> {
  await page
    .locator(TREE_GRID)
    .evaluate((el: HTMLElement) => {
      const sr = el.shadowRoot;
      const body =
        sr?.querySelector('[part~="body"]') ??
        sr?.querySelector('#table') ??
        sr?.querySelector('.cells-body');
      const target = (body as HTMLElement | null) ?? el;
      target.scrollTop = 0;
    })
    .catch(() => undefined);
}
