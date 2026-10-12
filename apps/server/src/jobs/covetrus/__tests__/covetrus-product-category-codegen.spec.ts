import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  renderProductCategoryObjectFile,
  resolveProductCategoryObjectFilePath,
  toProductCategoryObjectKey,
  writeProductCategoryObjectFile,
} from '../covetrus-product-category-codegen';
import type { ProductCategoryTreeNode } from '../covetrus-product-category-tree';

describe('covetrus-product-category-codegen', () => {
  describe('toProductCategoryObjectKey', () => {
    it('camel-cases plain labels', () => {
      expect(toProductCategoryObjectKey('Pharmaceutical')).toBe(
        'pharmaceutical',
      );
      expect(toProductCategoryObjectKey('pet food')).toBe('petFood');
      expect(toProductCategoryObjectKey('Consumables')).toBe('consumables');
      expect(toProductCategoryObjectKey('Adaptors')).toBe('adaptors');
    });

    it('strips punctuation like LegalCategory-style keys', () => {
      expect(toProductCategoryObjectKey('Instruments/Equip')).toBe(
        'instrumentsEquip',
      );
      expect(toProductCategoryObjectKey('WRS (Waiting Room Sales)')).toBe(
        'wrsWaitingRoomSales',
      );
    });

    it('prefixes keys that start with a digit', () => {
      expect(toProductCategoryObjectKey('2nd Hand')).toBe('cat2ndHand');
    });
  });

  describe('renderProductCategoryObjectFile', () => {
    it('renders nested const object matching the category forest', () => {
      const forest: ProductCategoryTreeNode[] = [
        {
          label: 'Consumables',
          children: [
            {
              label: 'Anaesthesia',
              children: [
                { label: 'Adaptors', children: [] },
                { label: 'Circuits', children: [] },
              ],
            },
            { label: 'Clothing And PPE', children: [] },
          ],
        },
        { label: 'Pet Food', children: [] },
      ];

      const source = renderProductCategoryObjectFile(forest);

      expect(source).toContain('export const ProductCategory = {');
      expect(source).toContain('  consumables: {');
      expect(source).toContain('    anaesthesia: {');
      expect(source).toContain('      adaptors: "Adaptors",');
      expect(source).toContain('      circuits: "Circuits",');
      expect(source).toContain('    clothingAndPPE: "Clothing And PPE",');
      expect(source).toContain('  petFood: "Pet Food",');
      expect(source).toContain('} as const;');
      expect(source).toContain(
        'export type ProductCategoryTree = typeof ProductCategory;',
      );
    });

    it('deduplicates colliding sibling keys with numeric suffixes', () => {
      const forest: ProductCategoryTreeNode[] = [
        { label: 'Pet Food', children: [] },
        { label: 'Pet-Food', children: [] },
      ];

      const source = renderProductCategoryObjectFile(forest);
      expect(source).toContain('  petFood: "Pet Food",');
      expect(source).toContain('  petFood2: "Pet-Food",');
    });
  });

  describe('resolveProductCategoryObjectFilePath', () => {
    it('resolves from apps/server-style cwd', () => {
      const repoRoot = path.resolve(__dirname, '../../../../../../');
      const appsServerCwd = path.join(repoRoot, 'apps/server');
      const resolved = resolveProductCategoryObjectFilePath(appsServerCwd);
      expect(resolved).toBe(
        path.join(
          repoRoot,
          'packages/shared/src/catalogue/product-category.ts',
        ),
      );
    });
  });

  describe('writeProductCategoryObjectFile', () => {
    it('writes the rendered nested object source', async () => {
      const dir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'vetply-product-category-'),
      );
      const filePath = path.join(dir, 'product-category.ts');

      await writeProductCategoryObjectFile(filePath, [
        {
          label: 'Consumables',
          children: [{ label: 'Adaptors', children: [] }],
        },
      ]);

      const written = await fs.promises.readFile(filePath, 'utf8');
      expect(written).toContain('consumables: {');
      expect(written).toContain('adaptors: "Adaptors"');
    });
  });
});
