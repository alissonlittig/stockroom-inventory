<script lang="ts">
  import { inv, download } from '$lib/store.svelte';
  import { money, productsCsv, status, toCents, type Product } from '$lib/inventory';

  let q = $state('');
  let filter = $state<'all' | 'alerts'>('all');
  let dlg: HTMLDialogElement;
  let editing = $state<Product | null>(null);
  let error = $state('');
  let toast = $state('');
  let f = $state({ sku: '', name: '', category: '', unit: 'pcs', cost: '', price: '', stock: '0', min: '5' });

  const rows = $derived(
    inv.products.filter((p) => {
      const t = q.trim().toLowerCase();
      const hit = !t || [p.name, p.sku, p.category].some((v) => v.toLowerCase().includes(t));
      return hit && (filter === 'all' || status(p) !== 'ok');
    })
  );

  function openForm(p?: Product) {
    editing = p ?? null;
    error = '';
    f = p
      ? { sku: p.sku, name: p.name, category: p.category, unit: p.unit, cost: (p.cost / 100).toFixed(2), price: (p.price / 100).toFixed(2), stock: String(p.stock), min: String(p.min) }
      : { sku: '', name: '', category: '', unit: 'pcs', cost: '', price: '', stock: '0', min: '5' };
    dlg.showModal();
  }
  function save(e: SubmitEvent) {
    e.preventDefault();
    const err = inv.upsert(
      { sku: f.sku, name: f.name, category: f.category, unit: f.unit, cost: toCents(f.cost || 0), price: toCents(f.price || 0), stock: Number(f.stock), min: Number(f.min) },
      editing?.id
    );
    if (err) { error = err; return; }
    dlg.close();
    say(editing ? 'Product updated.' : 'Product added.');
  }
  function del(p: Product) {
    if (confirm(`Delete "${p.name}" and its movement history?`)) { inv.remove(p.id); say('Product deleted.'); }
  }
  function say(m: string) { toast = m; setTimeout(() => (toast = ''), 2600); }
</script>

<svelte:head><title>Products · Stockroom</title></svelte:head>

<div class="head">
  <div><h1>Products</h1><p>Your catalogue with live stock levels. Anything at or under its minimum is flagged.</p></div>
  <div class="actions">
    <button class="btn" onclick={() => download('stockroom-products.csv', productsCsv(inv.products))}>Export CSV</button>
    <button class="btn primary" onclick={() => openForm()}>Add product</button>
  </div>
</div>

<section class="card">
  <div class="tools">
    <label class="field">Search<input type="search" bind:value={q} placeholder="Name, SKU or category" /></label>
    <label class="field">Show
      <select bind:value={filter}><option value="all">All products</option><option value="alerts">Only low or out</option></select>
    </label>
  </div>
  {#if !inv.ready}
    <p class="muted" role="status">Loading…</p>
  {:else if rows.length}
    <div class="tablewrap">
      <table class="stack">
        <thead><tr><th>Product</th><th>Category</th><th class="num">Cost</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {#each rows as p (p.id)}
            <tr>
              <td class="name">{p.name}<div class="muted mono">{p.sku}</div></td>
              <td data-label="Category">{p.category}</td>
              <td class="num" data-label="Cost">{money(p.cost)}</td>
              <td class="num" data-label="Price">{money(p.price)}</td>
              <td class="num" data-label="Stock"><span>{p.stock} {p.unit} <span class="muted">/ min {p.min}</span></span></td>
              <td data-label="Status"><span class="badge {status(p)}">{{ ok: 'In stock', low: 'Low', out: 'Out' }[status(p)]}</span></td>
              <td data-label="">
                <div class="actions" style="justify-content:flex-end">
                  <button class="btn sm" onclick={() => openForm(p)} aria-label="Edit {p.name}">Edit</button>
                  <button class="btn sm danger" onclick={() => del(p)} aria-label="Delete {p.name}">Delete</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="empty">No products match. {#if inv.products.length === 0}<button class="btn sm" onclick={() => inv.reset()}>Load demo data</button>{/if}</p>
  {/if}
</section>

<dialog bind:this={dlg} aria-labelledby="pt">
  <form class="dlg" onsubmit={save}>
    <h2 id="pt">{editing ? 'Edit product' : 'Add product'}</h2>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="formgrid">
      <label class="field wide">Name<input bind:value={f.name} required autocomplete="off" /></label>
      <label class="field">SKU<input bind:value={f.sku} required autocomplete="off" /></label>
      <label class="field">Category<input bind:value={f.category} placeholder="General" autocomplete="off" /></label>
      <label class="field">Cost (USD)<input type="number" min="0" step="0.01" inputmode="decimal" bind:value={f.cost} /></label>
      <label class="field">Price (USD)<input type="number" min="0" step="0.01" inputmode="decimal" bind:value={f.price} /></label>
      <label class="field">Stock<input type="number" min="0" step="1" inputmode="numeric" bind:value={f.stock} /></label>
      <label class="field">Minimum<span class="hint">Alert at or below this</span><input type="number" min="0" step="1" inputmode="numeric" bind:value={f.min} /></label>
      <label class="field">Unit<input bind:value={f.unit} placeholder="pcs" autocomplete="off" /></label>
    </div>
    <div class="row">
      <button type="button" class="btn" onclick={() => dlg.close()}>Cancel</button>
      <button class="btn primary">Save product</button>
    </div>
  </form>
</dialog>
{#if toast}<div class="toast" role="status">{toast}</div>{/if}
