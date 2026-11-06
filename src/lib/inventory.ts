export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number; // cents
  price: number; // cents
  min: number; // reorder level
  stock: number;
};
export type Movement = {
  id: string;
  productId: string;
  type: 'in' | 'out';
  qty: number;
  note: string;
  at: string; // ISO
};
export type State = { products: Product[]; movements: Movement[] };
export type Status = 'out' | 'low' | 'ok';

export const status = (p: Product): Status => (p.stock <= 0 ? 'out' : p.stock <= p.min ? 'low' : 'ok');

export const lowStock = (ps: Product[]) =>
  ps.filter((p) => status(p) !== 'ok').sort((a, b) => a.stock / Math.max(a.min, 1) - b.stock / Math.max(b.min, 1));

export const stockValue = (ps: Product[]) => ps.reduce((s, p) => s + p.stock * p.cost, 0);

export type MoveResult = { ok: true; state: State } | { ok: false; error: string };

/** Applies an in/out movement. Refuses unknown products, non-integer/non-positive qty and stock below zero. */
export function applyMovement(
  state: State,
  m: Omit<Movement, 'id' | 'at'>,
  now = new Date(),
  id: string = crypto.randomUUID()
): MoveResult {
  const p = state.products.find((x) => x.id === m.productId);
  if (!p) return { ok: false, error: 'Choose a product.' };
  if (!Number.isInteger(m.qty) || m.qty <= 0) return { ok: false, error: 'Quantity must be a whole number above zero.' };
  const next = p.stock + (m.type === 'in' ? m.qty : -m.qty);
  if (next < 0) return { ok: false, error: `Only ${p.stock} ${p.unit} in stock.` };
  return {
    ok: true,
    state: {
      products: state.products.map((x) => (x.id === p.id ? { ...x, stock: next } : x)),
      movements: [{ ...m, id, at: now.toISOString() }, ...state.movements]
    }
  };
}

export function validateProduct(p: Omit<Product, 'id'>, others: Product[], selfId?: string): string | null {
  if (!p.name.trim()) return 'Name is required.';
  if (!p.sku.trim()) return 'SKU is required.';
  if (others.some((o) => o.id !== selfId && o.sku.toLowerCase() === p.sku.trim().toLowerCase())) return 'That SKU already exists.';
  if (![p.cost, p.price, p.min, p.stock].every((n) => Number.isFinite(n) && n >= 0)) return 'Numbers cannot be negative.';
  if (!Number.isInteger(p.stock) || !Number.isInteger(p.min)) return 'Stock and minimum must be whole numbers.';
  return null;
}

export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export const toCents = (v: string | number) => Math.round(Number(v) * 100);

const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export const csv = (rows: (string | number)[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

export const productsCsv = (ps: Product[]) =>
  csv([
    ['SKU', 'Name', 'Category', 'Unit', 'Cost', 'Price', 'Stock', 'Minimum', 'Status', 'Stock value'],
    ...ps.map((p) => [
      p.sku, p.name, p.category, p.unit,
      (p.cost / 100).toFixed(2), (p.price / 100).toFixed(2),
      p.stock, p.min, status(p), ((p.stock * p.cost) / 100).toFixed(2)
    ])
  ]);

export const movementsCsv = (s: State) =>
  csv([
    ['Date', 'SKU', 'Product', 'Type', 'Quantity', 'Note'],
    ...s.movements.map((m) => {
      const p = s.products.find((x) => x.id === m.productId);
      return [m.at, p?.sku ?? '', p?.name ?? '(deleted)', m.type, m.qty, m.note];
    })
  ]);

export function byCategory(ps: Product[]) {
  const map = new Map<string, { category: string; items: number; units: number; value: number }>();
  for (const p of ps) {
    const c = map.get(p.category) ?? { category: p.category, items: 0, units: 0, value: 0 };
    c.items++;
    c.units += p.stock;
    c.value += p.stock * p.cost;
    map.set(p.category, c);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/** Units in/out per day for the last `days` days ending at `now` (UTC day buckets). */
export function dailyFlow(ms: Movement[], days = 14, now = new Date()) {
  const out: { day: string; in: number; out: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push({ day: new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10), in: 0, out: 0 });
  }
  for (const m of ms) {
    const row = out.find((r) => r.day === m.at.slice(0, 10));
    if (row) row[m.type] += m.qty;
  }
  return out;
}

export function topMovers(s: State, n = 5) {
  const t = new Map<string, number>();
  for (const m of s.movements) if (m.type === 'out') t.set(m.productId, (t.get(m.productId) ?? 0) + m.qty);
  return [...t.entries()]
    .map(([id, qty]) => ({ product: s.products.find((p) => p.id === id), qty }))
    .filter((r): r is { product: Product; qty: number } => !!r.product)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, n);
}

/** Fictional demo data: a small paper-and-coffee shop. */
export function seed(now = new Date()): State {
  const rows: [string, string, string, string, number, number, number, number][] = [
    ['PAP-001', 'Dot-grid notebook A5', 'Paper', 'pcs', 4.2, 12.9, 38, 15],
    ['PAP-002', 'Recycled sketchpad A4', 'Paper', 'pcs', 5.1, 14.5, 9, 12],
    ['PAP-003', 'Sticky tabs, 6 colours', 'Paper', 'pack', 1.3, 4.9, 54, 20],
    ['PEN-001', 'Fineliner 0.4 mm, black', 'Pens', 'pcs', 0.9, 3.2, 120, 40],
    ['PEN-002', 'Brush pen, sepia', 'Pens', 'pcs', 1.8, 5.9, 0, 10],
    ['PEN-003', 'Fountain pen, matte navy', 'Pens', 'pcs', 14, 39, 6, 5],
    ['INK-001', 'Bottled ink 30 ml, ocean', 'Ink', 'pcs', 4.4, 11.5, 4, 6],
    ['COF-001', 'House blend, 250 g', 'Coffee', 'bag', 5.8, 13.9, 22, 12],
    ['COF-002', 'Single origin Huila, 250 g', 'Coffee', 'bag', 7.9, 18.5, 3, 8],
    ['COF-003', 'Ceramic pour-over dripper', 'Coffee', 'pcs', 9.5, 24, 14, 5],
    ['GFT-001', 'Linen tote bag', 'Gifts', 'pcs', 3.6, 15, 27, 10],
    ['GFT-002', 'Wax seal kit', 'Gifts', 'pcs', 6.2, 19, 11, 6]
  ];
  const products: Product[] = rows.map(([sku, name, category, unit, cost, price, stock, min], i) => ({
    id: `p${i + 1}`, sku, name, category, unit, cost: toCents(cost), price: toCents(price), stock, min
  }));
  // deterministic pseudo-history so the charts are not empty
  const movements: Movement[] = [];
  let n = 0;
  for (let d = 13; d >= 0; d--) {
    for (let k = 0; k < 3; k++) {
      n++;
      const p = products[(n * 5 + d) % products.length];
      const type = n % 4 === 0 ? 'in' : 'out';
      const at = new Date(now.getTime() - d * 864e5 - k * 36e5).toISOString();
      movements.push({ id: `m${n}`, productId: p.id, type, qty: 1 + ((n * 7) % 6), note: type === 'in' ? 'Supplier delivery' : 'Counter sale', at });
    }
  }
  movements.sort((a, b) => b.at.localeCompare(a.at));
  return { products, movements };
}
