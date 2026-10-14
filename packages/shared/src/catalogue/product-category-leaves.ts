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
