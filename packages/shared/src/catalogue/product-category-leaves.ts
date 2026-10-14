import { ProductCategory, type ProductCategoryTree } from './product-category';

export type ProductCategoryLeafRef = {
  /** Dot path of object keys, e.g. consumables.anaesthesia.adaptors */
  path: string;
  /** Leaf display label from Covetrus, e.g. Adaptors */
  label: string;
};

type CategoryNode = string | { readonly [key: string]: CategoryNode };

export function listProductCategoryLeafRefs(
  tree: ProductCategoryTree = ProductCategory,
): ProductCategoryLeafRef[] {
  const leaves: ProductCategoryLeafRef[] = [];
  walkCategoryNode(tree as CategoryNode, [], leaves);
  return leaves;
}

export function isProductCategoryLeafPath(
  path: string,
  tree: ProductCategoryTree = ProductCategory,
): boolean {
  return listProductCategoryLeafRefs(tree).some((leaf) => leaf.path === path);
}

export function findProductCategoryLeafRef(
  path: string,
  tree: ProductCategoryTree = ProductCategory,
): ProductCategoryLeafRef | null {
  return (
    listProductCategoryLeafRefs(tree).find((leaf) => leaf.path === path) ?? null
  );
}

/** Human-readable breadcrumb for a leaf path, e.g. Consumables › Anaesthesia › Adaptors. */
export function formatProductCategoryPathDisplay(
  path: string,
  tree: ProductCategoryTree = ProductCategory,
): string {
  const trimmed = path.trim();
  if (trimmed === '') {
    return '';
  }
  const leaf = findProductCategoryLeafRef(trimmed, tree);
  const segments = trimmed.split('.').filter((part) => part.length > 0);
  return segments
    .map((segment, index) => {
      const isLast = index === segments.length - 1;
      if (isLast && leaf != null) {
        return leaf.label;
      }
      return prettifyProductCategoryKey(segment);
    })
    .join(' › ');
}

function prettifyProductCategoryKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function walkCategoryNode(
  node: CategoryNode,
  keyPath: string[],
  leaves: ProductCategoryLeafRef[],
): void {
  if (typeof node === 'string') {
    if (keyPath.length === 0) {
      return;
    }
    leaves.push({ path: keyPath.join('.'), label: node });
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    walkCategoryNode(child, [...keyPath, key], leaves);
  }
}
