import { describe, expect, it } from 'vitest';
import { applyMovement, byCategory, csv, dailyFlow, lowStock, productsCsv, seed, status, stockValue, topMovers, validateProduct, type State } from './inventory';

const base = (): State => ({
  products: [
    { id: 'a', sku: 'A-1', name: 'Alpha', category: 'X', unit: 'pcs', cost: 100, price: 250, min: 5, stock: 10 },
    { id: 'b', sku: 'B-1', name: 'Beta', category: 'Y', unit: 'pcs', cost: 200, price: 500, min: 5, stock: 5 },
    { id: 'c', sku: 'C-1', name: 'Gamma', category: 'Y', unit: 'pcs', cost: 300, price: 700, min: 2, stock: 0 }
  ],
  movements: []
});
const now = new Date('2026-11-06T12:00:00Z');

describe('status and alerts', () => {
  it('classifies stock', () => {
    const [a, b, c] = base().products;
    expect([status(a), status(b), status(c)]).toEqual(['ok', 'low', 'out']);
  });
  it('lists low and out items, most urgent first', () => {
    expect(lowStock(base().products).map((p) => p.id)).toEqual(['c', 'b']);
  });
  it('values stock at cost', () => expect(stockValue(base().products)).toBe(10 * 100 + 5 * 200));
});

describe('applyMovement', () => {
  it('adds and removes stock and logs the movement', () => {
    const r1 = applyMovement(base(), { productId: 'a', type: 'out', qty: 4, note: '' }, now, 'm1');
    if (!r1.ok) throw new Error(r1.error);
    expect(r1.state.products[0].stock).toBe(6);
    const r2 = applyMovement(r1.state, { productId: 'a', type: 'in', qty: 10, note: 'po' }, now, 'm2');
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.state.products[0].stock).toBe(16);
    expect(r2.state.movements.map((m) => m.id)).toEqual(['m2', 'm1']);
  });
  it('refuses going below zero, bad qty and unknown product', () => {
    expect(applyMovement(base(), { productId: 'b', type: 'out', qty: 6, note: '' }).ok).toBe(false);
    expect(applyMovement(base(), { productId: 'a', type: 'in', qty: 0, note: '' }).ok).toBe(false);
    expect(applyMovement(base(), { productId: 'a', type: 'in', qty: 1.5, note: '' }).ok).toBe(false);
    expect(applyMovement(base(), { productId: 'zz', type: 'in', qty: 1, note: '' }).ok).toBe(false);
  });
  it('does not mutate the input state', () => {
    const s = base();
    applyMovement(s, { productId: 'a', type: 'out', qty: 1, note: '' });
    expect(s.products[0].stock).toBe(10);
  });
});

describe('validateProduct', () => {
  const { id: _id, ...ok } = base().products[0];
  it('accepts a good product and rejects duplicate SKUs (case-insensitive)', () => {
    expect(validateProduct({ ...ok, sku: 'NEW-1' }, base().products)).toBeNull();
    expect(validateProduct({ ...ok, sku: 'b-1' }, base().products)).toMatch(/exists/);
    expect(validateProduct({ ...ok }, base().products, 'a')).toBeNull();
  });
  it('rejects blanks, negatives and fractional stock', () => {
    expect(validateProduct({ ...ok, name: ' ' }, [])).toMatch(/Name/);
    expect(validateProduct({ ...ok, price: -1 }, [])).toMatch(/negative/);
    expect(validateProduct({ ...ok, stock: 1.5 }, [])).toMatch(/whole/);
  });
});

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csv([['a,b', 'say "hi"', 'x\ny']])).toBe('"a,b","say ""hi""","x\ny"\r\n');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(csv([['=SUM(A1)', '+1', '@x']])).toBe("'=SUM(A1),'+1,'@x\r\n");
  });
  it('exports products with status and value', () => {
    const lines = productsCsv(base().products).trim().split('\r\n');
    expect(lines[0]).toContain('Stock value');
    expect(lines[2]).toBe('B-1,Beta,Y,pcs,2.00,5.00,5,5,low,10.00');
  });
});

describe('reports', () => {
  it('groups by category by value', () => {
    expect(byCategory(base().products).map((c) => [c.category, c.value])).toEqual([['X', 1000], ['Y', 1000]]);
  });
  it('buckets daily flow over the window', () => {
    const s = seed(now);
    const flow = dailyFlow(s.movements, 14, now);
    expect(flow).toHaveLength(14);
    expect(flow.at(-1)!.day).toBe('2026-11-06');
    expect(flow.reduce((t, r) => t + r.in + r.out, 0)).toBe(s.movements.reduce((t, m) => t + m.qty, 0));
  });
  it('ranks top sellers by units out', () => {
    let s = base();
    for (const [id, q] of [['a', 2], ['b', 5], ['a', 1]] as const) {
      const r = applyMovement(s, { productId: id, type: 'out', qty: q, note: '' });
      if (r.ok) s = r.state;
    }
    expect(topMovers(s).map((r) => [r.product.id, r.qty])).toEqual([['b', 5], ['a', 3]]);
  });
});

describe('seed', () => {
  it('has fictional data with both a low and an out-of-stock item', () => {
    const ps = seed().products;
    expect(ps.some((p) => status(p) === 'out') && ps.some((p) => status(p) === 'low')).toBe(true);
  });
});
