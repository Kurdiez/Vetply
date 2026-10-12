import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Logger } from '@nestjs/common';
import type { Page } from 'playwright';

const logger = new Logger('CovetrusProductCategoryPageDump');

export type CovetrusCategoryPageDumpPaths = {
  dir: string;
  pageHtmlPath: string;
  gridLightDomPath: string;
  gridShadowDomPath: string;
  metaPath: string;
};

/** Writes the live catalog page + category-grid DOM for offline parser debugging. */
export async function dumpCovetrusCategoryPageForDebug(
  page: Page,
  reason: string,
): Promise<CovetrusCategoryPageDumpPaths> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(
    process.cwd(),
    'covetrus-product-category-debug',
    stamp,
  );
  await fs.mkdir(dir, { recursive: true });

  const pageHtmlPath = path.join(dir, 'page.html');
  const gridLightDomPath = path.join(dir, 'category-tree-grid-light.html');
  const gridShadowDomPath = path.join(dir, 'category-tree-grid-shadow.html');
  const metaPath = path.join(dir, 'meta.json');

  const pageHtml = await page.content();
  await fs.writeFile(pageHtmlPath, pageHtml, 'utf8');

  const gridDump = await page.evaluate(() => {
    const grid =
      document.querySelector('#category-tree-grid') ??
      document.querySelector('vaadin-grid[id="category-tree-grid"]');

    const cells = grid
      ? [...grid.querySelectorAll('vaadin-grid-cell-content')].map((cell) => {
          const toggle = cell.querySelector(
            'vaadin-grid-tree-toggle',
          ) as HTMLElement | null;
          const levelStyle = toggle?.style.getPropertyValue('--_level') ?? null;
          return {
            slot: cell.getAttribute('slot'),
            text: (cell.textContent || '').replace(/\s+/g, ' ').trim(),
            hasToggle: Boolean(toggle),
            toggleLevelCss: levelStyle,
            toggleLeaf:
              toggle?.hasAttribute('leaf') ||
              (toggle as HTMLElement & { leaf?: boolean })?.leaf === true,
            toggleExpanded:
              toggle?.hasAttribute('expanded') ||
              (toggle as HTMLElement & { expanded?: boolean })?.expanded ===
                true,
            html: (cell as HTMLElement).outerHTML.slice(0, 4_000),
          };
        })
      : [];

    const ariaRows = grid?.shadowRoot
      ? [...grid.shadowRoot.querySelectorAll('[role="row"]')].map((row) => {
          const cell = row.querySelector('[role="gridcell"], th, td');
          const slotEl = cell?.querySelector('slot');
          const slotName = slotEl?.getAttribute('name') ?? null;
          const slotted = slotName
            ? grid.querySelector(`[slot="${slotName}"]`)
            : null;
          return {
            text: (slotted?.textContent || row.textContent || '')
              .replace(/\s+/g, ' ')
              .trim(),
            ariaLevel: row.getAttribute('aria-level'),
            ariaExpanded: row.getAttribute('aria-expanded'),
            ariaRowIndex: row.getAttribute('aria-rowindex'),
            part: row.getAttribute('part'),
            collapsedAttr: row.hasAttribute('collapsed'),
            slotName,
          };
        })
      : [];

    return {
      gridFound: Boolean(grid),
      gridLightHtml: grid ? (grid as HTMLElement).outerHTML : '',
      gridShadowHtml: grid?.shadowRoot?.innerHTML ?? '',
      cellCount: cells.length,
      ariaRowCount: ariaRows.length,
      cells: cells.slice(0, 300),
      ariaRows: ariaRows.slice(0, 300),
    };
  });

  await fs.writeFile(gridLightDomPath, gridDump.gridLightHtml || '', 'utf8');
  await fs.writeFile(gridShadowDomPath, gridDump.gridShadowHtml || '', 'utf8');

  const meta = {
    reason,
    dumpedAt: new Date().toISOString(),
    pageUrl: page.url(),
    frameUrls: page.frames().map((frame) => frame.url()),
    gridFound: gridDump.gridFound,
    cellCount: gridDump.cellCount,
    ariaRowCount: gridDump.ariaRowCount,
    cells: gridDump.cells,
    ariaRows: gridDump.ariaRows,
  };
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  logger.log(
    `COVETRUS_PRODUCT_CATEGORY_PAGE_DUMP reason=${reason} dir=${dir} meta=${metaPath}`,
  );

  return {
    dir,
    pageHtmlPath,
    gridLightDomPath,
    gridShadowDomPath,
    metaPath,
  };
}
