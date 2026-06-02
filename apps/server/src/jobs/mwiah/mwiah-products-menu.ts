import type { Page } from 'playwright';

export const MAX_MENU_DEPTH = 12;

export type MwiahMenuNode = {
  label: string;
  href: string | null;
  children: MwiahMenuNode[];
};

export function resolveMwiahCategoryUrl(
  href: string,
  storeOrigin: string,
): string {
  const trimmed = href.trim();
  if (trimmed === '') {
    throw new Error('Category href cannot be empty');
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${storeOrigin.replace(/\/$/, '')}${path}`;
}

export function collectMwiahMenuCategoryUrls(
  tree: MwiahMenuNode,
  storeOrigin: string,
  ancestorPath: string[] = [],
): string[] {
  const menuPath = [...ancestorPath, tree.label].filter(
    (s, i, arr) => i === 0 || s !== arr[i - 1],
  );

  if (tree.children.length === 0) {
    if (!tree.href?.trim()) {
      return [];
    }
    return [resolveMwiahCategoryUrl(tree.href.trim(), storeOrigin)];
  }

  const urls: string[] = [];
  for (const child of tree.children) {
    urls.push(...collectMwiahMenuCategoryUrls(child, storeOrigin, menuPath));
  }

  return urls;
}

export function dedupeCategoryUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

async function scrapeProductsMenuFromDom(page: Page): Promise<MwiahMenuNode> {
  const tree = await page.evaluate((maxDepth) => {
    type Node = { label: string; href: string | null; children: Node[] };

    function parseMenuItem(li: Element, depth: number): Node | null {
      if (depth >= maxDepth) {
        return null;
      }
      const textEl = li.querySelector('[data-test-selector="menuItemText"]');
      const anchor = li.querySelector(':scope > a');
      if (!textEl || !anchor) {
        return null;
      }
      const label = (textEl.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (label === '') {
        return null;
      }
      const href = anchor.getAttribute('href');
      const childUl = li.querySelector(':scope > ul');
      const children: Node[] = [];
      if (childUl) {
        for (const childLi of childUl.querySelectorAll(
          ':scope > li[data-test-selector="menuItem"]',
        )) {
          const child = parseMenuItem(childLi, depth + 1);
          if (child) {
            children.push(child);
          }
        }
      }
      return { label, href, children };
    }

    let bestNav: Element | null = null;
    let bestTopLevelCount = 0;
    for (const wrapper of document.querySelectorAll(
      '[data-test-selector="mainNavigationLink-Products"]',
    )) {
      const nav = wrapper.querySelector(
        'nav[data-test-selector="mainNavigationItem_0"]',
      );
      if (!nav) {
        continue;
      }
      const rootUl = nav.querySelector(':scope > ul');
      const count = rootUl
        ? rootUl.querySelectorAll(':scope > li[data-test-selector="menuItem"]')
            .length
        : 0;
      if (count > bestTopLevelCount) {
        bestTopLevelCount = count;
        bestNav = nav;
      }
    }

    if (!bestNav) {
      return { label: 'Products', href: null, children: [] };
    }

    const rootUl = bestNav.querySelector(':scope > ul');
    if (!rootUl) {
      return { label: 'Products', href: null, children: [] };
    }

    const children: Node[] = [];
    for (const li of rootUl.querySelectorAll(
      ':scope > li[data-test-selector="menuItem"]',
    )) {
      const node = parseMenuItem(li, 0);
      if (node) {
        children.push(node);
      }
    }
    return { label: 'Products', href: null, children };
  }, MAX_MENU_DEPTH);

  return tree;
}

export async function scrapeMwiahProductsMenuTree(
  page: Page,
): Promise<MwiahMenuNode> {
  return scrapeProductsMenuFromDom(page);
}
