import { browser } from '$app/environment';
import { applyMovement, seed, validateProduct, type Movement, type Product, type State } from './inventory';

const KEY = 'stockroom:v1';

function load(): State {
  if (browser) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as State;
        if (Array.isArray(s.products) && Array.isArray(s.movements)) return s;
      }
    } catch {
      /* corrupted storage: fall back to the demo data below */
    }
  }
  return seed();
}

class Inventory {
  products = $state<Product[]>([]);
  movements = $state<Movement[]>([]);
  ready = $state(false);

  init() {
    if (this.ready) return;
    const s = load();
    this.products = s.products;
    this.movements = s.movements;
    this.ready = true;
  }
  #save() {
    localStorage.setItem(KEY, JSON.stringify({ products: this.products, movements: this.movements }));
  }
  get snapshot(): State {
    return { products: $state.snapshot(this.products) as Product[], movements: $state.snapshot(this.movements) as Movement[] };
  }
  move(m: Omit<Movement, 'id' | 'at'>) {
    const r = applyMovement(this.snapshot, m);
    if (r.ok) {
      this.products = r.state.products;
      this.movements = r.state.movements;
      this.#save();
    }
    return r.ok ? null : r.error;
  }
  /** Returns an error message, or null when saved. */
  upsert(p: Omit<Product, 'id'>, id?: string) {
    const err = validateProduct(p, this.products, id);
    if (err) return err;
    const clean = { ...p, name: p.name.trim(), sku: p.sku.trim().toUpperCase(), category: p.category.trim() || 'General', unit: p.unit.trim() || 'pcs' };
    this.products = id
      ? this.products.map((x) => (x.id === id ? { ...clean, id } : x))
      : [{ ...clean, id: crypto.randomUUID() }, ...this.products];
    this.#save();
    return null;
  }
  remove(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.movements = this.movements.filter((m) => m.productId !== id);
    this.#save();
  }
  reset() {
    const s = seed();
    this.products = s.products;
    this.movements = s.movements;
    this.#save();
  }
}

export const inv = new Inventory();

export function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
