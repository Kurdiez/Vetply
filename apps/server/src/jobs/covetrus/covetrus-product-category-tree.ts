export type ProductCategoryTreeNode = {
  label: string;
  children: ProductCategoryTreeNode[];
};

/** Merge a visible leveled window into a persistent forest (path-aware). */
export function mergeLeveledRowsIntoForest(
  forest: ProductCategoryTreeNode[],
  rows: Array<{ label: string; level: number }>,
): void {
  const stack: ProductCategoryTreeNode[] = [];

  for (const row of rows) {
    const label = row.label.trim();
    if (label === '') {
      continue;
    }
    const level = Math.max(0, row.level);

    while (stack.length > level) {
      stack.pop();
    }

    const siblings =
      stack.length === 0 ? forest : stack[stack.length - 1]!.children;
    const existing = siblings.find(
      (node) => node.label.toLowerCase() === label.toLowerCase(),
    );
    const node = existing ?? { label, children: [] };
    if (existing == null) {
      siblings.push(node);
    }

    stack.push(node);
  }
}

export function countTreeNodes(forest: ProductCategoryTreeNode[]): number {
  let count = 0;
  const walk = (nodes: ProductCategoryTreeNode[]): void => {
    for (const node of nodes) {
      count += 1;
      walk(node.children);
    }
  };
  walk(forest);
  return count;
}

export function collectLeafLabels(forest: ProductCategoryTreeNode[]): string[] {
  const leaves: string[] = [];
  const walk = (nodes: ProductCategoryTreeNode[]): void => {
    for (const node of nodes) {
      if (node.children.length === 0) {
        leaves.push(node.label);
        continue;
      }
      walk(node.children);
    }
  };
  walk(forest);
  return leaves;
}

export function sortForestInPlace(forest: ProductCategoryTreeNode[]): void {
  forest.sort((a, b) => a.label.localeCompare(b.label));
  for (const node of forest) {
    sortForestInPlace(node.children);
  }
}
