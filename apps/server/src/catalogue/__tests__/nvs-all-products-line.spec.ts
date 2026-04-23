import { parseNvsAllProductsLine } from '@vetply/shared';

describe('parseNvsAllProductsLine', () => {
  it('parses a typical line with spaced pack token', () => {
    const r = parseNvsAllProductsLine(
      '00000309    COLLATE LAMB KICK START (25D) 100ML       0019.210',
    );
    expect(r).toEqual({
      supplierProductId: '00000309',
      name: 'COLLATE LAMB KICK START (25D)',
      pack: '100ML',
      listedPrice: '0019.210',
    });
  });

  it('parses PK glued after closing paren', () => {
    const r = parseNvsAllProductsLine(
      '00005782    DUROGESIC 100 PATCH (CD SCH 2)PK5         0135.580',
    );
    expect(r).toEqual({
      supplierProductId: '00005782',
      name: 'DUROGESIC 100 PATCH (CD SCH 2)',
      pack: 'PK5',
      listedPrice: '0135.580',
    });
  });

  it('parses PK3 pack with fallback split', () => {
    const r = parseNvsAllProductsLine(
      '00000863    CATAC MAJOR SPARE TEAT LGE    PK3         0002.970',
    );
    expect(r).toEqual({
      supplierProductId: '00000863',
      name: 'CATAC MAJOR SPARE TEAT LGE',
      pack: 'PK3',
      listedPrice: '0002.970',
    });
  });

  it('parses volume glued to description (5L)', () => {
    const r = parseNvsAllProductsLine(
      '00003694    CLIK POUR ON 50MG/ML FOR SHEEP5L          0262.480',
    );
    expect(r).toEqual({
      supplierProductId: '00003694',
      name: 'CLIK POUR ON 50MG/ML FOR SHEEP',
      pack: '5L',
      listedPrice: '0262.480',
    });
  });

  it('returns null for invalid lines', () => {
    expect(parseNvsAllProductsLine('')).toBeNull();
    expect(parseNvsAllProductsLine('not-a-line')).toBeNull();
    expect(parseNvsAllProductsLine('1234567 x')).toBeNull();
  });
});
