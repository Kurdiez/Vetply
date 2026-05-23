import type { Frame, Page } from 'playwright';

export type CovetrusCategoryRow = {
  label: string;
  count?: number;
};

const SIDEBAR_MARKER_TIMEOUT_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs inside Chromium — stringified for `page.evaluate` / `frame.evaluate`. */
function browserCollectSidebarRows(): {
  label: string;
  count?: number;
}[] {
  const out: { label: string; count?: number }[] = [];
  const seen = new Set<string>();

  function titleMatches(t: string): boolean {
    const n = t.replace(/\s+/g, ' ').trim();
    if (!n || n.length > 80) {
      return false;
    }
    if (/^categories$/i.test(n)) {
      return true;
    }
    if (/^product categories$/i.test(n)) {
      return true;
    }
    if (/^product catalog(ue)?$/i.test(n)) {
      return true;
    }
    if (/^browse categories$/i.test(n)) {
      return true;
    }
    if (/^shop by category$/i.test(n)) {
      return true;
    }
    if (/^category filters?$/i.test(n)) {
      return true;
    }
    if (/\bcategories?\b/i.test(n) && n.length <= 60) {
      return true;
    }
    return false;
  }

  function isVisible(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      return false;
    }
    const st = window.getComputedStyle(el);
    return (
      st.visibility !== 'hidden' &&
      st.display !== 'none' &&
      Number(st.opacity) > 0
    );
  }

  function isNoiseNavLabel(raw: string): boolean {
    const n = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (n.length <= 1) {
      return true;
    }
    return (
      /^(home|sign in|sign-in|login|logout|log out|cart|basket|checkout|account|my account|help|contact|search|privacy|terms|cookies|skip to main content|menu|close)$/i.test(
        n,
      ) || /^[\d\s,]+$/.test(n)
    );
  }

  function addIfValidRow(raw: string): void {
    if (!raw || titleMatches(raw)) {
      return;
    }
    const matchCount = raw.match(/\(?([\d,]+)\s*\)?\s*$/);
    let label = raw;
    let count: number | undefined;
    if (matchCount?.[1] != null) {
      const num = Number(matchCount[1].replace(/,/g, ''));
      if (Number.isFinite(num)) {
        count = num;
        label =
          matchCount.index != null
            ? raw.slice(0, matchCount.index).trim()
            : raw.replace(matchCount[0], '').trim();
      }
    }
    if (!label || label.length < 2) {
      return;
    }
    if (isNoiseNavLabel(label)) {
      return;
    }
    const key = label.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(count != null ? { label, count } : { label });
  }

  function collectFromRoot(root: Element): void {
    root
      .querySelectorAll('a, button, [role="treeitem"], [role="row"], li')
      .forEach((node) => {
        const raw = (node.textContent || '').replace(/\s+/g, ' ').trim();
        addIfValidRow(raw);
      });
  }

  /** Covetrus Connect: categories live in a Vaadin grid, not aside/nav links. */
  function extractFromCovetrusCategoryGrid(): boolean {
    const grid =
      document.querySelector('#category-tree-grid') ??
      document.querySelector('vaadin-grid[id="category-tree-grid"]') ??
      document.querySelector('.category-tree-grid-container vaadin-grid');
    if (!grid) {
      return false;
    }
    const cells = grid.querySelectorAll('vaadin-grid-cell-content');
    for (const cell of cells) {
      if (!isVisible(cell)) {
        continue;
      }
      const raw = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      addIfValidRow(raw);
    }
    return out.length > 0;
  }

  function findCategoryHeading(): Element | null {
    for (const el of document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,[role="heading"]',
    )) {
      if (!isVisible(el)) {
        continue;
      }
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (titleMatches(t)) {
        return el;
      }
    }

    for (const root of document.querySelectorAll(
      'aside, [role="complementary"], nav, [class*="sidebar" i]',
    )) {
      for (const el of root.querySelectorAll(
        'h1,h2,h3,h4,h5,h6, button, span, div, p, strong, legend',
      )) {
        if (!isVisible(el)) {
          continue;
        }
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (t.length > 80) {
          continue;
        }
        if (titleMatches(t)) {
          return el;
        }
      }
    }

    const leaf = [...document.querySelectorAll('*')].find(
      (el) =>
        el.childElementCount === 0 &&
        isVisible(el) &&
        titleMatches((el.textContent || '').trim()),
    );
    return leaf ?? null;
  }

  function expandHeadingRoot(heading: Element): Element | null {
    let root: Element | null = heading.parentElement;
    for (let depth = 0; depth < 12 && root; depth += 1) {
      const candidates = root.querySelectorAll(
        'a, button, [role="treeitem"], [role="row"], li',
      );
      if (candidates.length >= 3) {
        return root;
      }
      root = root.parentElement;
    }
    return root;
  }

  function extractFromHeading(): boolean {
    const heading = findCategoryHeading();
    if (!heading) {
      return false;
    }

    const root = expandHeadingRoot(heading);
    if (!root) {
      return false;
    }

    collectFromRoot(root);
    return out.length > 0;
  }

  /** Vertical rails / facet panels — avoids thin horizontal top nav bars. */
  function isLikelyCategoryRail(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 120) {
      return false;
    }
    if (r.width > window.innerWidth * 0.65) {
      return false;
    }
    return r.height >= Math.min(220, r.width * 2);
  }

  function countUsefulLinks(root: Element): number {
    let n = 0;
    for (const a of root.querySelectorAll('a')) {
      if (!isVisible(a)) {
        continue;
      }
      const raw = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (isNoiseNavLabel(raw)) {
        continue;
      }
      if (raw.length < 2 || raw.length > 120) {
        continue;
      }
      n += 1;
    }
    return n;
  }

  function extractFromHeuristicRail(): boolean {
    const selectors =
      'aside, [role="complementary"], nav, [class*="sidebar" i], [class*="navigation" i], [class*="facet" i], [class*="filter" i]';
    const pool = [...document.querySelectorAll(selectors)];

    const candidates = pool.filter(isLikelyCategoryRail);
    const searchIn = candidates.length > 0 ? candidates : pool;

    let best: Element | null = null;
    let bestScore = 0;
    for (const root of searchIn) {
      const score = countUsefulLinks(root);
      if (score > bestScore) {
        bestScore = score;
        best = root;
      }
    }

    if (!best || bestScore < 2) {
      return false;
    }

    out.length = 0;
    seen.clear();
    collectFromRoot(best);
    return out.length >= 2;
  }

  out.length = 0;
  seen.clear();
  if (extractFromCovetrusCategoryGrid()) {
    return out;
  }

  out.length = 0;
  seen.clear();
  extractFromHeading();
  if (out.length > 0) {
    return out;
  }

  out.length = 0;
  seen.clear();
  if (extractFromHeuristicRail()) {
    return out;
  }

  return out;
}

function browserSidebarReady(): boolean {
  function covetrusCategoryTreeLooksReady(): boolean {
    const grid =
      document.querySelector('#category-tree-grid') ??
      document.querySelector('vaadin-grid[id="category-tree-grid"]');
    if (!grid) {
      return false;
    }
    if (grid.querySelector('vaadin-grid-tree-toggle')) {
      return true;
    }
    for (const cell of grid.querySelectorAll('vaadin-grid-cell-content')) {
      const t = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^.+\s+\([\d,]+\)\s*$/.test(t)) {
        return true;
      }
    }
    return false;
  }

  if (covetrusCategoryTreeLooksReady()) {
    return true;
  }

  function titleMatches(t: string): boolean {
    const n = t.replace(/\s+/g, ' ').trim();
    if (!n || n.length > 80) {
      return false;
    }
    if (/^categories$/i.test(n)) {
      return true;
    }
    if (/^product categories$/i.test(n)) {
      return true;
    }
    if (/^product catalog(ue)?$/i.test(n)) {
      return true;
    }
    if (/^browse categories$/i.test(n)) {
      return true;
    }
    if (/^shop by category$/i.test(n)) {
      return true;
    }
    if (/^category filters?$/i.test(n)) {
      return true;
    }
    if (/\bcategories?\b/i.test(n) && n.length <= 60) {
      return true;
    }
    return false;
  }

  function isVisible(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      return false;
    }
    const st = window.getComputedStyle(el);
    return (
      st.visibility !== 'hidden' &&
      st.display !== 'none' &&
      Number(st.opacity) > 0
    );
  }

  function isNoiseNavLabel(raw: string): boolean {
    const n = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (n.length <= 1) {
      return true;
    }
    return (
      /^(home|sign in|sign-in|login|logout|log out|cart|basket|checkout|account|my account|help|contact|search|privacy|terms|cookies|skip to main content|menu|close)$/i.test(
        n,
      ) || /^[\d\s,]+$/.test(n)
    );
  }

  function isLikelyCategoryRail(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 120) {
      return false;
    }
    if (r.width > window.innerWidth * 0.65) {
      return false;
    }
    return r.height >= Math.min(220, r.width * 2);
  }

  function countUsefulLinks(root: Element): number {
    let n = 0;
    for (const a of root.querySelectorAll('a')) {
      if (!isVisible(a)) {
        continue;
      }
      const raw = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (isNoiseNavLabel(raw)) {
        continue;
      }
      if (raw.length < 2 || raw.length > 120) {
        continue;
      }
      n += 1;
    }
    return n;
  }

  for (const el of document.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,[role="heading"]',
  )) {
    if (!isVisible(el)) {
      continue;
    }
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (titleMatches(t)) {
      return true;
    }
  }

  for (const root of document.querySelectorAll(
    'aside, [role="complementary"], nav, [class*="sidebar" i]',
  )) {
    for (const el of root.querySelectorAll(
      'h1,h2,h3,h4,h5,h6, button, span, div, p, strong, legend',
    )) {
      if (!isVisible(el)) {
        continue;
      }
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > 80) {
        continue;
      }
      if (titleMatches(t)) {
        return true;
      }
    }
  }

  const selectors =
    'aside, [role="complementary"], nav, [class*="sidebar" i], [class*="navigation" i], [class*="facet" i], [class*="filter" i]';
  const pool = [...document.querySelectorAll(selectors)];
  const rails = pool.filter(isLikelyCategoryRail);
  const searchIn = rails.length > 0 ? rails : pool;

  for (const rail of searchIn) {
    if (countUsefulLinks(rail) >= 3) {
      return true;
    }
  }

  return false;
}

export function findCategoryCountInSidebar(
  rows: CovetrusCategoryRow[],
  categoryLabel: string,
): number | undefined {
  const target = categoryLabel.trim().toLowerCase();
  const match = rows.find((row) => row.label.trim().toLowerCase() === target);
  return match?.count;
}

export async function extractCategoriesFromSidebar(
  page: Page,
): Promise<CovetrusCategoryRow[]> {
  try {
    await page.waitForFunction(browserSidebarReady, undefined, {
      timeout: SIDEBAR_MARKER_TIMEOUT_MS,
    });
  } catch {
    await sleep(4000);
  }

  await sleep(500);

  let rows = await page.evaluate(browserCollectSidebarRows);

  if (rows.length === 0) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) {
        continue;
      }
      try {
        rows = await evaluateSidebarInFrame(frame);
      } catch {
        rows = [];
      }
      if (rows.length > 0) {
        break;
      }
    }
  }

  return rows;
}

async function evaluateSidebarInFrame(
  frame: Frame,
): Promise<CovetrusCategoryRow[]> {
  try {
    await frame.waitForFunction(browserSidebarReady, undefined, {
      timeout: 20_000,
    });
  } catch {
    await sleep(2000);
  }

  await sleep(300);

  return frame.evaluate(browserCollectSidebarRows);
}
